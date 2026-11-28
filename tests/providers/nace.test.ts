import { decideOperation } from '../../src/index.js'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Context } from '@deepseek-ai/cordis'
import type { ProviderRequest } from '../../src/contracts/index.js'
import { System1ProviderError } from '../../src/contracts/error.js'
import { System1Engine } from '../../src/core/engine.js'
import System1Service from '../../src/index.js'
import * as providerBundle from '../../src/providers/index.js'
import { createNaceProvider } from '../../src/providers/nace/adapter.js'
import { NACE_MODELS } from '../../src/providers/nace/models.js'
import { projectCatalog } from '../../src/settings-wire.js'
import { describeCandidate, previewRoute } from '../../src/client/operation-routes.js'

const UUID_WORKSPACE = '00000000-0000-4000-8000-000000000001'
const UUID_FILE = '00000000-0000-4000-8000-000000000002'
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
const request: ProviderRequest = {
  requestId: 'fixture-request',
  model: 'drex-v2.0',
  state: { ticket: 42 },
  questions: { q: { type: 'noul', instructions: 'Is this a support request?' } },
}

function uploadedRequest(size = 32, model = 'drex-max-v1.1'): ProviderRequest {
  const bytes = Buffer.alloc(size)
  PNG_SIGNATURE.copy(bytes)
  return {
    ...request,
    model,
    images: [{ mediaType: 'image/png', data: bytes.toString('base64') }],
  }
}

function systemOneResponse(answers: Record<string, unknown>) {
  return Response.json({
    model: 'drex-v2.0',
    usage: { input_tokens: 12, output_tokens: 4, image_tokens: 0 },
    answers,
  })
}

function statusOf(value: unknown): unknown {
  return value && typeof value === 'object' && 'status' in value
    ? value.status
    : undefined
}

function createUploadFixture(options: {
  onSystemOne?: (body: Record<string, unknown>, init?: RequestInit) => Promise<Response> | Response
  failGrantNumber?: number
  failDelete?: boolean
  onUpload?: (number: number, init?: RequestInit) => void
} = {}) {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  let grantNumber = 0
  let uploadNumber = 0
  let deleteNumber = 0
  let resolveDeleteStarted!: () => void
  const deleteStarted = new Promise<void>((resolve) => { resolveDeleteStarted = resolve })
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const url = String(input)
    calls.push({ url, ...(init ? { init } : {}) })
    if (url.endsWith('/v1/documents/upload-grants')) {
      grantNumber++
      if (grantNumber === options.failGrantNumber)
        return Response.json({ error: { message: 'private upload response' } }, { status: 503 })
      return Response.json({
        workspace_id: UUID_WORKSPACE,
        upload_url: `https://uploads.nace.test/upload/${grantNumber}`,
        token: `temporary-upload-${grantNumber}`,
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        max_bytes: null,
      })
    }
    if (url.startsWith('https://uploads.nace.test/')) {
      uploadNumber++
      options.onUpload?.(uploadNumber, init)
      return Response.json({
        job_id: `upload-job-${uploadNumber}`,
        kind: 'upload',
        status: 'succeeded',
        result: {
          file: {
            workspace_id: UUID_WORKSPACE,
            file_id: UUID_FILE,
            path: `temporary-${uploadNumber}.png`,
          },
        },
      })
    }
    if (url.endsWith('/v1/systemone')) {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>
      return await options.onSystemOne?.(body, init) ?? systemOneResponse({
        q: { type: 'noul', noul: 0.8 },
      })
    }
    if (url.includes('/v1/documents/workspaces/')) {
      deleteNumber++
      resolveDeleteStarted()
      if (options.failDelete)
        return Response.json({ error: { message: 'private delete response' } }, { status: 500 })
      return Response.json({
        object: 'file_deletion',
        workspace_id: UUID_WORKSPACE,
        file_id: UUID_FILE,
        status: 'deleted',
      })
    }
    throw new Error(`Unexpected fixture URL: ${url}`)
  }
  return {
    fetch,
    calls,
    get uploadCount() { return uploadNumber },
    get deleteCount() { return deleteNumber },
    get grantCount() { return grantNumber },
    whenDeleted: () => deleteStarted,
  }
}

test('Nace catalog separates hosted aliases from a compatible deployment', async () => {
  assert.deepEqual(NACE_MODELS.map(({ id }) => id), [
    'drex-max-v1.2',
    'drex-max-finance',
  ])
  const provider = createNaceProvider({ apiKey: '' })
  const compatible = createNaceProvider({ apiKey: '', baseURL: 'https://nace.fixture.test' })
  const signal = new AbortController().signal
  assert.equal(provider.timeoutMs(), 60_000)
  assert.deepEqual(await compatible.describe('drex-v2.0', signal), {
    primitives: ['noul', 'choice', 'score'],
    maxQuestions: 512,
    maxChoiceOptions: null,
    maxScoreLevels: null,
    context: {
      maxTokens: 131_072,
      includesQuestions: false,
      maxStatePlusQuestionTokens: 262_144,
    },
  })
  const max = await provider.describe('drex-max-v1.2', signal)
  assert.deepEqual(max, {
    primitives: ['noul', 'choice', 'score'],
    maxQuestions: 512,
    maxChoiceOptions: 255,
    maxScoreLevels: 255,
    images: {
      formats: ['image/png', 'image/jpeg', 'image/webp'],
      maxCount: 8,
      maxBytesPerImage: 16 * 1024 * 1024,
      maxTotalBytes: 32 * 1024 * 1024,
    },
    context: { maxTokens: 262_144, includesQuestions: true },
  })
  assert.deepEqual(await provider.describe('drex-v2.0', signal), max)
  assert.deepEqual(await provider.describe('drex-max-v1.1', signal), max)
  assert.deepEqual(await provider.describe('drex-max-finance', signal), max)
  assert.deepEqual(await compatible.describe('drex-max-v1.1', signal), max)
  await assert.rejects(
    provider.describe('drex-latest', signal),
    (error: unknown) =>
      error instanceof System1ProviderError && error.detail.code === 'unsupported',
  )
})

test('Nace serializes structured descriptions, retains null criteria, and normalizes score legends', async () => {
  const questions = {
    yes: {
      type: 'noul',
      instructions: { prompt: 'Is it positive?', locale: 'en' },
      criteria: { true: { meaning: 'positive' }, false: 'negative' },
    },
    topic: {
      type: 'choice',
      instructions: 'Choose a topic.',
      criteria: { support: { team: 'care' }, unknown: null },
    },
    level: {
      type: 'score',
      instructions: ['rate', 'urgency'],
      criteria: ['low', { meaning: 'high' }],
    },
  } as const
  const fixture = createUploadFixture({
    onSystemOne(body) {
      assert.equal(body.model, 'drex-v2.0')
      assert.deepEqual(body.state, { ticket: 42 })
      assert.deepEqual(body.questions, {
        yes: {
          type: 'noul',
          instructions: '{"prompt":"Is it positive?","locale":"en"}',
          criteria: { true: '{"meaning":"positive"}', false: 'negative' },
        },
        topic: {
          type: 'choice',
          instructions: 'Choose a topic.',
          criteria: { support: '{"team":"care"}', unknown: null },
        },
        level: {
          type: 'score',
          instructions: '["rate","urgency"]',
          criteria: ['low', '{"meaning":"high"}'],
        },
      })
      assert.equal(body.images, undefined)
      return systemOneResponse({
        yes: { type: 'noul', noul: 0.9 },
        topic: {
          type: 'choice',
          choice: 'support',
          probabilities: { support: 0.75, unknown: 0.25 },
          confidence: 0.75,
        },
        level: {
          type: 'score',
          score: 0.4,
          legend: ['low', '{"meaning":"high"}'],
          probabilities: { '0': 0.6, '1': 0.4 },
          confidence: 0.7,
        },
      })
    },
  })
  const provider = createNaceProvider({
    apiKey: 'fixture-only',
    baseURL: 'https://api.nace.test/root///',
    fetch: fixture.fetch,
  })
  const result = await provider.evaluate(
    { ...request, questions },
    new AbortController().signal,
  )
  const call = fixture.calls[0]!
  assert.equal(call.url, 'https://api.nace.test/root/v1/systemone')
  assert.equal(new Headers(call.init?.headers).get('authorization'), 'Bearer fixture-only')
  assert.equal(new Headers(call.init?.headers).get('x-nace-retry-count'), null)
  assert.deepEqual(result.answers.level, {
    status: 'ok',
    answer: {
      type: 'score',
      value: 0.4,
      levels: ['low', { meaning: 'high' }],
      probabilities: [0.6, 0.4],
      confidence: 0.7,
    },
  })
  assert.deepEqual(result.answers.topic, {
    status: 'ok',
    answer: {
      type: 'choice',
      value: 'support',
      probabilities: { support: 0.75, unknown: 0.25 },
      confidence: 0.75,
    },
  })
  assert.deepEqual(result.usage, { inputTokens: 12, outputTokens: 4 })
})

test('hosted Nace uses the Max v1.2 image path for a saved Drex v2.0 primary', async () => {
  const fixture = createUploadFixture({
    onSystemOne(body) {
      assert.equal(body.model, 'drex-max-v1.2')
      assert.deepEqual(body.images, [
        `data:image/png;base64,${uploadedRequest().images![0]!.data}`,
      ])
      return Response.json({
        model: 'drex-max-v1.2',
        answers: { q: { type: 'noul', noul: 0.8 } },
      })
    },
  })
  const provider = createNaceProvider({ apiKey: 'fixture-only', fetch: fixture.fetch })
  const primary = { provider: 'nace', model: 'drex-v2.0' }
  const fallback = { provider: 'nace', model: 'drex-max-v1.1' }
  const engine = new System1Engine({ defaultModel: primary, fallbackModels: [fallback] })
  engine.registerImplementation(decideOperation, 'nace', provider)
  const { state, questions, images } = uploadedRequest()
  const result = await engine.run(decideOperation, { state, questions, images })
  assert.equal(result.status, 'ok')
  assert.deepEqual(result.meta.requested, primary)
  assert.deepEqual(result.meta.executed, { provider: 'nace', model: 'drex-max-v1.2' })
  assert.deepEqual(result.meta.attempts, [{ ...primary, kind: 'executed' }])
  assert.equal(fixture.calls.length, 1)
  assert.deepEqual(result.status === 'ok' && result.value.answers.q, {
    status: 'ok',
    answer: { type: 'noul', probabilityTrue: 0.8 },
  })
  engine.dispose()
})

test('a failed hosted Max request does not send the same input again through its other IDs', async () => {
  const ids: unknown[] = []
  let missFirstCredential = false
  const provider = createNaceProvider({
    apiKey: '',
    resolveApiKey() {
      if (!missFirstCredential) return 'fixture-only'
      missFirstCredential = false
      return undefined
    },
    fetch: async (_input, init) => {
      const { model } = JSON.parse(String(init?.body))
      ids.push(model)
      return model === 'drex-max-finance'
        ? Response.json({ model, answers: { q: { type: 'noul', noul: 0.8 } } })
        : Response.json({ error: { message: 'offline overload' } }, { status: 529 })
    },
  })
  const candidates = ['drex-v2.0', 'drex-max-v1.1', 'drex-max-v1.2', 'drex-max-finance']
    .map((model) => ({ provider: 'nace', model }))
  const engine = new System1Engine({ defaultModel: candidates[0], fallbackModels: candidates.slice(1) })
  engine.registerImplementation(decideOperation, 'nace', provider)
  const result = await engine.run(decideOperation, { state: request.state, questions: request.questions })
  assert.equal(result.status, 'ok')
  assert.deepEqual(ids, ['drex-max-v1.2', 'drex-max-finance'])
  assert.deepEqual(result.meta.requested, candidates[0])
  assert.deepEqual(result.meta.executed, candidates[3])

  ids.length = 0
  missFirstCredential = true
  const recovered = await engine.run(decideOperation, { state: request.state, questions: request.questions })
  assert.deepEqual(ids, ['drex-max-v1.2', 'drex-max-finance'])
  assert.deepEqual(recovered.meta.attempts.map(({ model, kind }) => [model, kind]), [
    ['drex-v2.0', 'skipped'],
    ['drex-max-v1.1', 'executed'],
    ['drex-max-finance', 'executed'],
  ])
  engine.dispose()
})

test('changing the Nace base URL updates saved routes without moving an in-flight image', async () => {
  let baseURL = 'https://console.nace.ai:0443/.'
  let readBaseURL = () => baseURL
  let readingKey!: () => void
  const keyStarted = new Promise<void>((resolve) => { readingKey = resolve })
  let finishLookup!: (key: string) => void
  const key = new Promise<string>((resolve) => { finishLookup = resolve })
  const traffic: [string, string, boolean][] = []
  const provider = createNaceProvider({
    apiKey: '',
    resolveBaseURL: () => readBaseURL(),
    resolveApiKey: () => { readingKey(); return key },
    fetch: async (input, init) => {
      const body = JSON.parse(String(init?.body))
      traffic.push([new URL(String(input)).href, body.model, !!body.images?.length])
      return Response.json({ model: body.model, answers: { q: { type: 'noul', noul: 0.8 } } })
    },
  })
  const primary = { provider: 'nace', model: 'drex-v2.0' }
  const fallback = { provider: 'nace', model: 'drex-max-v1.1' }
  const engine = new System1Engine({ defaultModel: primary, fallbackModels: [fallback] })
  engine.registerImplementation(decideOperation, 'nace', provider)
  const entry = () => projectCatalog(engine.operations.getCatalog(new Set(), false)).operations[0]!
  const hosted = entry()
  const hostedModels = hosted.providers[0]!.models
  assert.deepEqual(hostedModels.kind === 'fixed' && hostedModels.models.map(({ id }) => id),
    ['drex-max-v1.2', 'drex-max-finance'])
  assert.deepEqual(describeCandidate(hosted, primary)?.inputs, ['text', 'image'])
  assert.deepEqual(previewRoute(hosted, [primary, fallback]).find(({ input }) => input.id === 'image')?.candidates.map(({ model }) => model),
    ['drex-max-v1.2'])

  const { state, questions, images } = uploadedRequest()
  const pending = engine.run(decideOperation, { state, questions, images })
  await keyStarted
  baseURL = 'https://nace.fixture.test'
  finishLookup('fixture-only')
  assert.deepEqual((await pending).meta.executed, { provider: 'nace', model: 'drex-max-v1.2' })

  const compatible = entry()
  const compatibleModels = compatible.providers[0]!.models
  assert.deepEqual(compatibleModels.kind === 'fixed' && compatibleModels.models.map(({ id }) => id),
    ['drex-v2.0', 'drex-max-v1.1', 'drex-max-finance'])
  assert.deepEqual(compatible.route.defaultModel, primary)
  assert.deepEqual(compatible.route.fallbackModels, [fallback])
  assert.deepEqual(describeCandidate(compatible, primary)?.inputs, ['text'])
  assert.deepEqual((await engine.run(decideOperation, { state, questions, images })).meta.executed, fallback)
  assert.deepEqual((await engine.run(decideOperation, { state, questions })).meta.executed, primary)
  const unsupported = await engine.run(decideOperation, { state, questions }, { model: { ...primary, model: 'drex-max-v1.2' } })
  assert.equal(unsupported.status === 'error' && unsupported.error.code, 'unsupported')

  // A change between the catalog read and execute must not send a model shared
  // by both directories (Finance) to the second deployment.
  let reads = 0
  readBaseURL = () => ++reads === 1 ? 'https://console.nace.ai' : 'https://nace.fixture.test'
  const finance = { ...primary, model: 'drex-max-finance' }
  assert.deepEqual((await engine.run(decideOperation, { state, questions, images }, { model: finance })).meta.executed, finance)
  assert.equal(reads, 1)
  assert.deepEqual(traffic, [
    ['https://console.nace.ai/v1/systemone', 'drex-max-v1.2', true],
    ['https://nace.fixture.test/v1/systemone', 'drex-max-v1.1', true],
    ['https://nace.fixture.test/v1/systemone', 'drex-v2.0', false],
    ['https://console.nace.ai/v1/systemone', 'drex-max-finance', true],
  ])
  engine.dispose()
})

test('Drex Max Finance sends images through the Max request path', async () => {
  const fixture = createUploadFixture({
    onSystemOne(body) {
      assert.equal(body.model, 'drex-max-finance')
      assert.deepEqual(body.images, [
        `data:image/png;base64,${uploadedRequest().images![0]!.data}`,
      ])
      return Response.json({
        model: 'drex-max-finance',
        answers: { q: { type: 'noul', noul: 0.8 } },
      })
    },
  })
  const provider = createNaceProvider({ apiKey: 'fixture-only', fetch: fixture.fetch })
  const result = await provider.evaluate(
    uploadedRequest(32, 'drex-max-finance'),
    new AbortController().signal,
  )
  assert.equal(result.model, 'drex-max-finance')
  assert.deepEqual(result.answers.q, {
    status: 'ok',
    answer: { type: 'noul', probabilityTrue: 0.8 },
  })
})

test('Nace accepts a score answer when the optional legend is absent', async () => {
  const fixture = createUploadFixture({
    onSystemOne: () => Response.json({
      model: 'drex-v2.0',
      usage: { input_tokens: 12, output_tokens: 4 },
      answers: {
        level: {
          type: 'score',
          score: 0.4,
          probabilities: { '0': 0.6, '1': 0.4 },
        },
      },
    }),
  })
  const provider = createNaceProvider({ apiKey: 'fixture-only', fetch: fixture.fetch })
  const result = await provider.evaluate({
    ...request,
    questions: {
      level: { type: 'score', instructions: 'Rate it.', criteria: ['low', 'high'] },
    },
  }, new AbortController().signal)

  assert.equal(statusOf(result.answers.level), 'ok')
})

test('Nace accepts a response without optional usage metadata', async () => {
  const fixture = createUploadFixture({
    onSystemOne: () => Response.json({
      model: 'drex-v2.0',
      answers: { q: { type: 'noul', noul: 0.8 } },
    }),
  })
  const provider = createNaceProvider({ apiKey: 'fixture-only', fetch: fixture.fetch })
  const result = await provider.evaluate(request, new AbortController().signal)

  assert.equal(statusOf(result.answers.q), 'ok')
  assert.equal('usage' in result, false)
})

test('Nace invalidates only malformed answers and preserves valid siblings', async () => {
  const fixture = createUploadFixture({
    onSystemOne: () => Response.json({
      model: 'drex-v2.0',
      usage: { input_tokens: 12, output_tokens: 4 },
      answers: {
        malformed: {
          type: 'score',
          score: 0.4,
          legend: ['low', 'high'],
          // A score answer without probabilities used to throw in the mapper.
        },
        typeMismatch: { type: 'noul', noul: 0.8 },
        legendWrongType: {
          type: 'score', score: 0.4, legend: 'low,high',
          probabilities: { '0': 0.6, '1': 0.4 },
        },
        legendMismatch: {
          type: 'score', score: 0.4, legend: ['low', 'other'],
          probabilities: { '0': 0.6, '1': 0.4 },
        },
        badProbabilityKeys: {
          type: 'score', score: 0.4, legend: ['low', 'high'],
          probabilities: { '0': 0.6, '2': 0.4 },
        },
        valid: { type: 'noul', noul: 0.8 },
      },
    }),
  })
  const engine = new System1Engine({ defaultModel: { provider: 'nace', model: 'drex-v2.0' } })
  engine.registerImplementation(decideOperation, 'nace', createNaceProvider({
    apiKey: 'fixture-only',
    fetch: fixture.fetch,
  }))

  const result = await engine.decide({
    state: 'fixture',
    questions: {
      malformed: { type: 'score', instructions: 'Rate it.', criteria: ['low', 'high'] },
      typeMismatch: { type: 'score', instructions: 'Rate it.', criteria: ['low', 'high'] },
      legendWrongType: { type: 'score', instructions: 'Rate it.', criteria: ['low', 'high'] },
      legendMismatch: { type: 'score', instructions: 'Rate it.', criteria: ['low', 'high'] },
      badProbabilityKeys: { type: 'score', instructions: 'Rate it.', criteria: ['low', 'high'] },
      valid: { type: 'noul', instructions: 'Is this valid?' },
    },
  })

  for (const id of ['malformed', 'typeMismatch', 'legendWrongType', 'legendMismatch', 'badProbabilityKeys'] as const) {
    const answer = result.answers[id]
    assert.equal(answer?.status, 'error', `${id} should be invalid`)
    if (answer?.status === 'error') assert.equal(answer.error.code, 'invalid_response')
  }
  assert.equal(result.answers.valid?.status, 'ok')
})

test('Nace rejects a response whose top-level answers is not an object', async () => {
  const fixture = createUploadFixture({
    onSystemOne: () => Response.json({
      model: 'drex-v2.0',
      usage: { input_tokens: 12, output_tokens: 4 },
      answers: [],
    }),
  })
  const engine = new System1Engine({ defaultModel: { provider: 'nace', model: 'drex-v2.0' } })
  engine.registerImplementation(decideOperation, 'nace', createNaceProvider({
    apiKey: 'fixture-only',
    fetch: fixture.fetch,
  }))

  const result = await engine.decide({
    state: 'fixture',
    questions: { q: { type: 'noul', instructions: 'Is this valid?' } },
  })

  assert.equal(result.answers.q?.status, 'error')
  if (result.answers.q?.status === 'error')
    assert.equal(result.answers.q.error.code, 'invalid_response')
})

test('Drex rounded choice and score probabilities remain valid DSH distributions', async () => {
  const criteria = ['Routine', 'Soon', 'Urgent']
  const fixture = createUploadFixture({
    onSystemOne: () => systemOneResponse({
      topic: {
        type: 'choice',
        choice: 'billing',
        probabilities: { billing: 0.7000, technical: 0.3001 },
      },
      urgency: {
        type: 'score',
        score: 0.9061,
        legend: criteria,
        probabilities: { '0': 0.3639, '1': 0.3662, '2': 0.2700 },
      },
    }),
  })
  const engine = new System1Engine({ defaultModel: { provider: 'nace', model: 'drex-v2.0' } })
  engine.registerImplementation(decideOperation, 'nace', createNaceProvider({
    apiKey: 'fixture-only',
    fetch: fixture.fetch,
  }))

  const result = await engine.decide({
    state: 'A refund has been pending for two weeks.',
    questions: {
      topic: {
        type: 'choice',
        instructions: 'Choose the team.',
        criteria: { billing: 'Payments or refunds', technical: 'Product errors' },
      },
      urgency: {
        type: 'score',
        instructions: 'Rate the urgency.',
        criteria,
      },
    },
  })

  const topic = result.answers.topic
  assert.equal(topic.status, 'ok')
  if (topic.status === 'ok')
    assert.ok(Math.abs(Object.values(topic.answer.probabilities).reduce((sum, value) => sum + value, 0) - 1) < 1e-12)

  const urgency = result.answers.urgency
  assert.equal(urgency.status, 'ok')
  if (urgency.status === 'ok') {
    const { probabilities, value } = urgency.answer
    assert.ok(Math.abs(probabilities.reduce((sum, probability) => sum + probability, 0) - 1) < 1e-12)
    const expected = probabilities.reduce((sum, probability, index) => sum + probability * index, 0)
    assert.ok(Math.abs(value - expected) <= 0.011)
  }
  engine.dispose()
})

test('Drex probability totals beyond the rounding bound remain invalid', async () => {
  const fixture = createUploadFixture({
    onSystemOne: () => systemOneResponse({
      urgency: {
        type: 'score',
        score: 0.301,
        legend: ['Routine', 'Urgent'],
        probabilities: { '0': 0.700, '1': 0.301 },
      },
    }),
  })
  const engine = new System1Engine({ defaultModel: { provider: 'nace', model: 'drex-v2.0' } })
  engine.registerImplementation(decideOperation, 'nace', createNaceProvider({
    apiKey: 'fixture-only',
    fetch: fixture.fetch,
  }))

  const result = await engine.decide({
    state: 'A refund has been pending for two weeks.',
    questions: {
      urgency: {
        type: 'score',
        instructions: 'Rate the urgency.',
        criteria: ['Routine', 'Urgent'],
      },
    },
  })

  assert.equal(
    result.answers.urgency.status === 'error'
      ? result.answers.urgency.error.code
      : 'ok',
    'invalid_response',
  )
  engine.dispose()
})

test('missing credentials and unsupported requests stop before Nace I/O', async () => {
  let calls = 0
  const provider = createNaceProvider({
    apiKey: '',
    baseURL: 'https://nace.fixture.test',
    fetch: async () => {
      calls++
      return systemOneResponse({ q: { type: 'noul', noul: 1 } })
    },
  })
  await assert.rejects(
    provider.evaluate(request, new AbortController().signal),
    (error: unknown) =>
      error instanceof System1ProviderError && error.detail.code === 'unavailable',
  )
  await assert.rejects(
    provider.evaluate(
      { ...request, model: 'drex-v2.0', images: uploadedRequest().images },
      new AbortController().signal,
    ),
    (error: unknown) =>
      error instanceof System1ProviderError && error.detail.code === 'unsupported',
  )
  assert.equal(calls, 0)

  const engine = new System1Engine({ defaultModel: { provider: 'nace', model: 'drex-max-v1.1' } })
  engine.registerImplementation(decideOperation, 'nace', provider)
  const run = await engine.run(decideOperation, { state: request.state, questions: request.questions })
  assert.equal(run.status === 'error' && run.reason, 'no_applicable_model')
  assert.equal(run.meta.attempts[0]?.kind, 'skipped')
  const result = await engine.decide({
    state: null,
    questions: { q: { type: 'box', instructions: 'Find the object.' } },
    images: uploadedRequest().images,
  })
  assert.equal(result.answers.q.status === 'error' && result.answers.q.error.code, 'unsupported')
  assert.equal(calls, 0)
  engine.dispose()
})

test('combined providers component registers Nace capabilities without consulting credentials', async (t) => {
  const ctx = new Context()
  const service = await ctx.plugin(System1Service, {
    defaultModel: { provider: 'nace', model: 'drex-max-v1.1' },
  })
  t.after(async () => { await service.dispose() })
  const bundle = await ctx.plugin(providerBundle, {
    naceBaseURL: 'https://nace.fixture.test',
  })
  t.after(async () => { await bundle.dispose() })
  const imageBytes = Buffer.alloc(8)
  PNG_SIGNATURE.copy(imageBytes)
  const result = await ctx.system1.decide({
    state: null,
    questions: { q: { type: 'box', instructions: 'Find an object.' } },
    images: [{ mediaType: 'image/png', data: imageBytes.toString('base64') }],
  })
  assert.deepEqual(result.answers.q, {
    status: 'error',
    error: { code: 'unsupported', message: 'Model does not support box.' },
  })
})

test('Nace rejects a body over 4 MiB locally before making a request', async () => {
  const fixture = createUploadFixture()
  const provider = createNaceProvider({ apiKey: 'fixture-only', fetch: fixture.fetch })
  await assert.rejects(
    provider.evaluate({
      ...request,
      state: 'x'.repeat(4_200_000),
    }, new AbortController().signal),
    (error: unknown) =>
      error instanceof System1ProviderError && error.detail.code === 'limit_exceeded',
  )
  assert.equal(fixture.calls.length, 0)
})

test('Nace maps HTTP errors safely and disables SDK retries', async () => {
  const cases = [
    { status: 401, code: 'unavailable', retryable: false },
    { status: 403, code: 'unavailable', retryable: false },
    { status: 402, code: 'provider_error', retryable: false },
    { status: 422, code: 'provider_error', retryable: false },
    { status: 429, code: 'provider_error', retryable: true },
    { status: 529, code: 'provider_error', retryable: true },
    { status: 503, code: 'provider_error', retryable: true },
  ] as const
  for (const expected of cases) {
    let calls = 0
    const provider = createNaceProvider({
      apiKey: 'fixture-only',
      fetch: async () => {
        calls++
        return Response.json({ error: { message: 'private upstream body' } }, {
          status: expected.status,
        })
      },
    })
    await assert.rejects(
      provider.evaluate(request, new AbortController().signal),
      (error: unknown) => {
        assert.ok(error instanceof System1ProviderError)
        assert.equal(error.detail.code, expected.code)
        assert.equal(error.detail.httpStatus, expected.status)
        assert.equal(error.detail.retryable, expected.retryable)
        assert.ok(!JSON.stringify(error.detail).includes('private upstream body'))
        return true
      },
    )
    assert.equal(calls, 1, `HTTP ${expected.status} must not be retried by the SDK`)
  }

  const connection = createNaceProvider({
    apiKey: 'fixture-only',
    fetch: async () => { throw new Error('private transport detail') },
  })
  await assert.rejects(
    connection.evaluate(request, new AbortController().signal),
    (error: unknown) =>
      error instanceof System1ProviderError &&
      error.detail.retryable === true &&
      !error.message.includes('private transport detail'),
  )
})

test('Max inlines images under 4 MiB and deletes account-level uploads after success', async () => {
  const small = uploadedRequest()
  const inline = createUploadFixture({
    onSystemOne(body) {
      const images = body.images as string[]
      assert.equal(images.length, 1)
      assert.match(images[0]!, /^data:image\/png;base64,/u)
      return systemOneResponse({ q: { type: 'noul', noul: 0.8 } })
    },
  })
  const inlineProvider = createNaceProvider({
    apiKey: 'fixture-only',
    fetch: inline.fetch,
  })
  const inlineResult = await inlineProvider.evaluate(small, new AbortController().signal)
  assert.equal(statusOf(inlineResult.answers.q), 'ok')
  assert.equal(inline.uploadCount, 0)
  assert.equal(inline.deleteCount, 0)

  const eightImages = Array.from({ length: 8 }, () => small.images![0]!)
  const manyImagesFixture = createUploadFixture({
    onSystemOne(body) {
      assert.equal((body.images as string[]).length, 8)
      return systemOneResponse({ q: { type: 'noul', noul: 0.8 } })
    },
  })
  const engine = new System1Engine({ defaultModel: { provider: 'nace', model: 'drex-max-v1.1' } })
  engine.registerImplementation(decideOperation, 'nace', createNaceProvider({
    apiKey: 'fixture-only',
    fetch: manyImagesFixture.fetch,
  }))
  const manyImages = await engine.decide({
    state: null,
    questions: request.questions,
    images: eightImages,
  })
  assert.equal(manyImages.answers.q?.status, 'ok')
  engine.dispose()

  const large = uploadedRequest(3_200_000)
  const fixture = createUploadFixture({
    onUpload(_number, init) {
      const headers = new Headers(init?.headers)
      assert.equal(headers.get('x-upload-token'), 'temporary-upload-1')
      assert.equal(headers.get('authorization'), null)
    },
    onSystemOne(body) {
      const images = body.images as Array<Record<string, unknown>>
      assert.deepEqual(images, [{
        type: 'workspace_file',
        workspace_id: UUID_WORKSPACE,
        file_id: UUID_FILE,
      }])
      assert.ok(Buffer.byteLength(JSON.stringify({
        state: body.state,
        questions: body.questions,
        images,
      })) <= 4_194_304)
      return systemOneResponse({ q: { type: 'noul', noul: 0.7 } })
    },
  })
  const provider = createNaceProvider({
    apiKey: 'fixture-only',
    fetch: fixture.fetch,
  })
  const result = await provider.evaluate(large, new AbortController().signal)
  assert.equal(statusOf(result.answers.q), 'ok')
  assert.equal(fixture.grantCount, 1)
  assert.equal(fixture.uploadCount, 1)
  await fixture.whenDeleted()
  assert.equal(fixture.deleteCount, 1)
  const grant = fixture.calls.find(({ url }) => url.endsWith('/v1/documents/upload-grants'))!
  assert.equal(new Headers(grant.init?.headers).get('authorization'), 'Bearer fixture-only')
  assert.equal(
    Object.hasOwn(JSON.parse(String(grant.init?.body)), 'workspace_id'),
    false,
    'temporary file uploads stay at account level, outside a workspace',
  )
})

test('Nace cleans partial uploads on failure and still attempts cleanup after cancellation', async () => {
  const large = {
    ...uploadedRequest(3_200_000),
    images: [uploadedRequest(3_200_000).images![0]!, uploadedRequest(3_200_000).images![0]!],
  }
  const partial = createUploadFixture({ failGrantNumber: 2 })
  const partialProvider = createNaceProvider({
    apiKey: 'fixture-only',
    fetch: partial.fetch,
  })
  await assert.rejects(
    partialProvider.evaluate(large, new AbortController().signal),
    (error: unknown) =>
      error instanceof System1ProviderError &&
      error.detail.httpStatus === 503 &&
      !error.message.includes('private upload response'),
  )
  assert.equal(partial.uploadCount, 1)
  await partial.whenDeleted()
  assert.equal(partial.deleteCount, 1)

  let enterSystemOne!: () => void
  const started = new Promise<void>((resolve) => { enterSystemOne = resolve })
  const cancelledFixture = createUploadFixture({
    onSystemOne(_body, init) {
      enterSystemOne()
      const signal = init?.signal as AbortSignal
      return new Promise<Response>((_resolve, reject) => {
        if (signal.aborted) reject(signal.reason)
        else signal.addEventListener('abort', () => reject(signal.reason), { once: true })
      })
    },
  })
  const cancelledProvider = createNaceProvider({
    apiKey: 'fixture-only',
    fetch: cancelledFixture.fetch,
  })
  const controller = new AbortController()
  const reason = new System1ProviderError({ code: 'cancelled', message: 'Decision cancelled.' })
  const pending = cancelledProvider.evaluate(uploadedRequest(3_200_000), controller.signal)
  await started
  controller.abort(reason)
  await assert.rejects(pending, (error: unknown) => error === reason)
  assert.equal(cancelledFixture.uploadCount, 1)
  await cancelledFixture.whenDeleted()
  assert.equal(cancelledFixture.deleteCount, 1)
})

test('temporary-file deletion failure is sanitized and does not discard a valid answer', async () => {
  const fixture = createUploadFixture({
    failDelete: true,
    onSystemOne: () => systemOneResponse({ q: { type: 'noul', noul: 0.8 } }),
  })
  const warnings: string[] = []
  let resolveWarning!: () => void
  const warned = new Promise<void>((resolve) => { resolveWarning = resolve })
  const provider = createNaceProvider({
    apiKey: 'fixture-only',
    fetch: fixture.fetch,
    warn: (message) => { warnings.push(message); resolveWarning() },
  })
  const result = await provider.evaluate(uploadedRequest(3_200_000), new AbortController().signal)
  assert.deepEqual(result.answers.q, {
    status: 'ok',
    answer: { type: 'noul', probabilityTrue: 0.8 },
  })
  await fixture.whenDeleted()
  await warned
  assert.equal(warnings.length, 1)
  assert.ok(!warnings[0]!.includes('fixture-only'))
  assert.ok(!warnings[0]!.includes('private delete response'))
})

test('retired Nace model IDs are rejected before credentials or network I/O', async () => {
  let credentialReads = 0
  let calls = 0
  const provider = createNaceProvider({
    apiKey: 'fixture-only',
    resolveApiKey: () => {
      credentialReads++
      return 'fixture-only'
    },
    fetch: async () => {
      calls++
      return systemOneResponse({ q: { type: 'noul', noul: 0.8 } })
    },
  })
  const signal = new AbortController().signal
  const unsupported = (error: unknown) =>
    error instanceof System1ProviderError && error.detail.code === 'unsupported'
  for (const model of ['drex-v1.5', 'drex-max']) {
    await assert.rejects(provider.describe(model, signal), unsupported)
    await assert.rejects(provider.evaluate({ ...request, model }, signal), unsupported)
  }
  assert.equal(credentialReads, 0)
  assert.equal(calls, 0)
})
