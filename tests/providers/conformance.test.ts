import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Primitive, ProviderRequest, System1Provider } from '../../src/contracts/index.js'
import type { ProviderModel } from '../../src/contracts/provider.js'
import { System1Engine } from '../../src/core/engine.js'
import {
  capabilitiesSchema,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENT_BASE64_LENGTH,
  MAX_ATTACHMENT_COUNT_PER_TYPE,
  MAX_TOTAL_ATTACHMENT_BYTES,
} from '../../src/core/validation.js'
import { createCloudflareProvider } from '../../src/providers/cloudflare/adapter.js'
import { CLOUDFLARE_MODELS } from '../../src/providers/cloudflare/models.js'
import { createLayaProvider } from '../../src/providers/laya/adapter.js'
import { LAYA_MODELS } from '../../src/providers/laya/models.js'
import { createNaceProvider } from '../../src/providers/nace/adapter.js'
import { NACE_MODELS } from '../../src/providers/nace/models.js'
import { createTypesafeProvider } from '../../src/providers/typesafe/adapter.js'
import { TYPESAFE_MODELS } from '../../src/providers/typesafe/models.js'

const allPrimitives: readonly Primitive[] = ['noul', 'choice', 'score', 'box']

interface ProviderSuite {
  id: string
  models: readonly ProviderModel[]
  create(fetch: typeof globalThis.fetch): System1Provider
  supports(model: string, primitive: Primitive): boolean
}

const suites: readonly ProviderSuite[] = [
  {
    id: 'typesafe',
    models: TYPESAFE_MODELS,
    create: (fetch) => createTypesafeProvider({ apiKey: 'fixture-only', fetch }),
    supports: (model, primitive) => primitive !== 'box' ||
      model === 'jev-1.14.0' || model === 'jev-preview',
  },
  {
    id: 'laya',
    models: LAYA_MODELS,
    create: (fetch) => createLayaProvider({ fetch }),
    supports: (_model, primitive) => primitive !== 'box',
  },
  {
    id: 'nace',
    models: NACE_MODELS,
    create: (fetch) => createNaceProvider({ apiKey: 'fixture-only', fetch }),
    supports: (_model, primitive) => primitive !== 'box',
  },
  {
    id: 'cloudflare',
    models: CLOUDFLARE_MODELS,
    create: (fetch) => createCloudflareProvider({
      apiKey: 'fixture-only',
      accountId: 'fixture-account',
      fetch,
    }),
    supports: (_model, primitive) => primitive !== 'box',
  },
]

test('built-in provider catalogs conform to required declarations and round-trip each supported primitive', async () => {
  for (const suite of suites) {
    for (const model of suite.models) {
      const fixture = createFixtureFetch(suite.id)
      const provider = suite.create(fixture.fetch)
      const timeout = provider.timeoutMs()
      assert.ok(Number.isSafeInteger(timeout) && timeout > 0, `${suite.id} timeout`)

      const capabilities = await provider.describe(model.id, new AbortController().signal)
      assert.ok(capabilitiesSchema.safeParse(capabilities).success, `${suite.id}/${model.id} capabilities`)
      assert.deepEqual(
        [...capabilities.primitives].sort(),
        allPrimitives.filter((primitive) => suite.supports(model.id, primitive)).sort(),
        `${suite.id}/${model.id} supported primitives match its fixtures`,
      )
      assertSafeLimits(suite.id, model.id, capabilities)
      for (const alias of model.aliases ?? []) {
        const aliasCapabilities = await provider.describe(alias, new AbortController().signal)
        assert.ok(capabilitiesSchema.safeParse(aliasCapabilities).success, `${suite.id}/${alias} capabilities`)
      }

      const engine = new System1Engine({
        defaultModel: { provider: suite.id, model: model.id },
      })
      engine.registerProvider(suite.id, provider)
      try {
        for (const primitive of capabilities.primitives) {
          const question = fixtureQuestion(primitive)
          const result = await engine.decide({
            state: 'fixture',
            questions: { q: question },
            ...(primitive === 'box'
              ? { images: [{ mediaType: 'image/png' as const, data: 'AAAA' }] }
              : {}),
          })
          assert.equal(result.answers.q.status, 'ok', `${suite.id}/${model.id}/${primitive}`)
          assert.equal(fixture.calls(), 1 + capabilities.primitives.indexOf(primitive), 'one fixture request per primitive')
        }

        const unsupportedPrimitive = allPrimitives.find(
          (primitive) => !capabilities.primitives.includes(primitive),
        )
        if (unsupportedPrimitive) {
          const before = fixture.calls()
          const result = await engine.decide({
            state: 'fixture',
            questions: { q: fixtureQuestion(unsupportedPrimitive) },
            ...(unsupportedPrimitive === 'box'
              ? { images: [{ mediaType: 'image/png' as const, data: 'AAAA' }] }
              : {}),
          })
          assert.equal(result.answers.q.status === 'error' && result.answers.q.error.code, 'unsupported')
          assert.equal(fixture.calls(), before, `${suite.id}/${model.id} rejects unsupported primitive before fetch`)
        }

        const unsupportedModality = (['images', 'audio', 'videos'] as const).find(
          (modality) => !capabilities[modality],
        )
        if (unsupportedModality) {
          const before = fixture.calls()
          const result = await engine.decide({
            state: 'fixture',
            questions: { q: fixtureQuestion('noul') },
            [unsupportedModality]: [{
              mediaType: unsupportedModality === 'images'
                ? 'image/png'
                : unsupportedModality === 'audio' ? 'audio/mpeg' : 'video/mp4',
              data: 'AAAA',
            }],
          })
          assert.equal(result.answers.q.status === 'error' && result.answers.q.error.code, 'unsupported')
          assert.equal(fixture.calls(), before, `${suite.id}/${model.id} rejects unsupported ${unsupportedModality} before fetch`)
        }

        if (capabilities.images && capabilities.images.maxCount < MAX_ATTACHMENT_COUNT_PER_TYPE) {
          const before = fixture.calls()
          const result = await engine.decide({
            state: 'fixture',
            questions: { q: fixtureQuestion('noul') },
            images: Array.from(
              { length: capabilities.images.maxCount + 1 },
              () => ({ mediaType: 'image/png' as const, data: 'AAAA' }),
            ),
          })
          assert.equal(result.answers.q.status === 'error' && result.answers.q.error.code, 'limit_exceeded')
          assert.equal(fixture.calls(), before, `${suite.id}/${model.id} enforces provider image count before fetch`)
        }
      } finally {
        engine.dispose()
      }
    }
  }
})

test('resource-safety ceilings keep their accepted values', () => {
  assert.equal(MAX_ATTACHMENT_COUNT_PER_TYPE, 16)
  assert.equal(MAX_ATTACHMENT_BYTES, 16 * 1024 * 1024)
  assert.equal(MAX_ATTACHMENT_BASE64_LENGTH, 22_369_624)
  assert.equal(MAX_TOTAL_ATTACHMENT_BYTES, 64 * 1024 * 1024)
})

function assertSafeLimits(
  provider: string,
  model: string,
  capabilities: Awaited<ReturnType<System1Provider['describe']>>,
): void {
  for (const [name, media] of Object.entries({
    images: capabilities.images,
    audio: capabilities.audio,
    videos: capabilities.videos,
  })) {
    if (!media) continue
    assert.ok(media.maxCount <= MAX_ATTACHMENT_COUNT_PER_TYPE, `${provider}/${model} ${name} count`)
    const maxBytes = 'maxBytesPerImage' in media ? media.maxBytesPerImage : media.maxBytesPerItem
    assert.ok(maxBytes <= MAX_ATTACHMENT_BYTES, `${provider}/${model} ${name} item size`)
  }
  if (capabilities.images)
    assert.ok(capabilities.images.maxTotalBytes <= MAX_TOTAL_ATTACHMENT_BYTES)
  if (capabilities.audioVideo?.maxTotalBytes !== undefined)
    assert.ok(capabilities.audioVideo.maxTotalBytes <= MAX_TOTAL_ATTACHMENT_BYTES)
}

function createFixtureFetch(provider: string) {
  let calls = 0
  const fetch: typeof globalThis.fetch = async (_input, init) => {
    calls++
    const body = JSON.parse(String(init?.body)) as {
      model?: string
      questions: Record<string, Record<string, unknown>>
    }
    const answers = Object.fromEntries(
      Object.entries(body.questions).map(([id, question]) => [
        id,
        fixtureAnswer(question, provider === 'nace'),
      ]),
    )
    const result = {
      model: body.model ?? (provider === 'laya' ? 'laya-fixture-model' : undefined),
      answers,
      ...(provider === 'nace'
        ? {
            usage: { input_tokens: 2, output_tokens: 1 },
            evaluation_time_ms: 1,
            request_id: 'fixture-request',
          }
        : {}),
    }
    return Response.json(provider === 'cloudflare'
      ? { success: true, result, errors: [], messages: [] }
      : result)
  }
  return { fetch, calls: () => calls }
}

function fixtureQuestion(primitive: Primitive): ProviderRequest['questions'][string] {
  if (primitive === 'choice')
    return { type: 'choice', instructions: 'Choose one.', criteria: { a: 'A', b: 'B' } }
  if (primitive === 'score')
    return { type: 'score', instructions: 'Rate it.', criteria: ['low', 'high'] }
  if (primitive === 'box')
    return { type: 'box', instructions: 'Locate the object.' }
  return { type: 'noul', instructions: 'Is it true?' }
}

function fixtureAnswer(question: Record<string, unknown>, nace: boolean): unknown {
  if (question.type === 'choice')
    return {
      type: 'choice',
      choice: 'a',
      probabilities: { a: 0.75, b: 0.25 },
      ...(nace ? { confidence: 0.75 } : {}),
    }
  if (question.type === 'score') {
    const criteria = question.criteria as readonly unknown[]
    return {
      type: 'score',
      score: 0.25,
      legend: nace
        ? criteria.map(stringifyDescription)
        : Object.fromEntries(criteria.map((value, index) => [String(index), value])),
      probabilities: { 0: 0.75, 1: 0.25 },
      ...(nace ? { confidence: 0.75 } : {}),
    }
  }
  if (question.type === 'box')
    return { type: 'box', box: { top: 0.1, bottom: 0.9, left: 0.2, right: 0.8 } }
  return { type: 'noul', noul: 0.75 }
}

function stringifyDescription(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value)
}
