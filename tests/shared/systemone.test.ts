import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ProviderRequest } from '../../src/contracts/index.js'
import type { ModelCapabilities } from '../../src/contracts/provider.js'
import { System1ProviderError } from '../../src/contracts/error.js'
import { createSystemOneHttpProvider } from '../../src/providers/systemone.js'

const request: ProviderRequest = {
  requestId: 'fixture',
  model: 'friendly-current',
  state: 'sample',
  questions: { decision: { type: 'noul', instructions: 'Is it valid?' } },
}

test('shared transport canonicalizes aliases before capabilities, serialization and response normalization', async () => {
  const models = new Map([
    ['friendly-current', { id: 'canonical-v2', aliases: ['friendly-current'] }],
    ['canonical-v2', { id: 'canonical-v2', aliases: ['friendly-current'] }],
  ])
  const described: string[] = []
  const serialized: string[] = []
  const requestModels: string[] = []
  let sentBody: unknown
  const provider = createSystemOneHttpProvider({
    providerName: 'fixture',
    defaultBaseURL: 'https://system-one.test',
    timeoutMs: () => 800,
    resolveApiKey: () => 'fixture-key',
    resolveModel: (model) => models.get(model),
    capabilities: (model) => {
      described.push(model)
      return capabilitiesFor(['noul'])
    },
    serializeRequest: (canonicalRequest) => {
      serialized.push(canonicalRequest.model)
      return { body: { state: canonicalRequest.state, questions: canonicalRequest.questions } }
    },
    requestModel: (model) => {
      requestModels.push(model)
      return model
    },
    fetch: async (_input, init) => {
      sentBody = JSON.parse(String(init?.body))
      return Response.json({
        answers: { decision: { type: 'noul', noul: 0.75 } },
      })
    },
  })

  assert.deepEqual(await provider.describe(request.model, new AbortController().signal), {
    primitives: ['noul'],
    maxQuestions: null,
    maxChoiceOptions: null,
    maxScoreLevels: null,
  })
  const response = await provider.evaluate(request, new AbortController().signal)

  assert.deepEqual(described, ['canonical-v2'])
  assert.deepEqual(serialized, ['canonical-v2'])
  assert.deepEqual(requestModels, ['canonical-v2'])
  assert.deepEqual(sentBody, {
    state: request.state,
    questions: request.questions,
    model: 'canonical-v2',
  })
  assert.equal(response.model, 'canonical-v2')
})

test('shared transport reports an unknown model before resolving missing credentials', async () => {
  let keyLookups = 0
  let fetchCalls = 0
  const provider = createSystemOneHttpProvider({
    providerName: 'fixture',
    defaultBaseURL: 'https://system-one.test',
    timeoutMs: () => 800,
    resolveApiKey: () => {
      keyLookups++
      return undefined
    },
    resolveModel: () => undefined,
    fetch: async () => {
      fetchCalls++
      return Response.json({})
    },
  })

  await assert.rejects(
    provider.evaluate(request, new AbortController().signal),
    (error: unknown) =>
      error instanceof System1ProviderError && error.detail.code === 'unsupported',
  )
  assert.equal(keyLookups, 0)
  assert.equal(fetchCalls, 0)
})

function capabilitiesFor(
  primitives: ModelCapabilities['primitives'],
  overrides: Partial<ModelCapabilities> = {},
): ModelCapabilities {
  return {
    primitives,
    maxQuestions: null,
    maxChoiceOptions: null,
    maxScoreLevels: null,
    ...overrides,
  }
}
