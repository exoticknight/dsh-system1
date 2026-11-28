import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ProviderRequest } from '../../src/contracts/provider.js'
import { System1ProviderError } from '../../src/contracts/error.js'
import { createOpenRouterProvider, OPENROUTER_MODELS } from '../../src/providers/openrouter/index.js'

const model = 'perplexity/pplx-decider-v1.3:free'
const build = 'perplexity/pplx-decider-v1.3-20261112'
const request: ProviderRequest = {
  requestId: 'local-fixture',
  model,
  state: { ticket: 'Charged twice' },
  questions: {
    refund: { type: 'noul', instructions: 'Refund requested?' },
    team: { type: 'choice', instructions: 'Which team?', criteria: { billing: 'Billing', technical: 'Technical' } },
    urgency: { type: 'score', instructions: 'How urgent?', criteria: ['Can wait', 'Today'] },
  },
}
const raw = {
  model: build,
  provider: 'Perplexity',
  usage: { input_tokens: 222, output_tokens: 3, cost: 0, is_byok: false },
  answers: {
    refund: { type: 'noul', noul: 0.8 },
    team: { type: 'choice', choice: 'billing', probabilities: { billing: 0.9, technical: 0.1 } },
    urgency: { type: 'score', score: 0.85, probabilities: { 0: 0.15, 1: 0.85 } },
  },
}
const signal = AbortSignal.timeout(3_000)
const withResponse = (body: unknown) => createOpenRouterProvider({
  apiKey: 'offline-fixture-key',
  fetch: async () => Response.json(body),
})

test('OpenRouter pins the zero-priced route and preserves the answered build and complete distributions', async () => {
  const provider = createOpenRouterProvider({
    apiKey: 'offline-fixture-key',
    fetch: async (input, init) => {
      assert.equal(String(input), 'https://openrouter.ai/api/alpha/decisions')
      assert.equal(init?.method, 'POST')
      assert.equal(init?.redirect, 'error')
      assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer offline-fixture-key')
      assert.deepEqual(JSON.parse(String(init?.body)), {
        model,
        provider: { only: ['perplexity'], allow_fallbacks: false, max_price: { prompt: '0', completion: '0', request: '0' } },
        state: '{"ticket":"Charged twice"}',
        questions: request.questions,
      })
      return Response.json(raw)
    },
  })
  assert.deepEqual(OPENROUTER_MODELS, [{ id: model }])
  assert.deepEqual((await provider.describe(model, signal)).primitives, ['noul', 'choice', 'score'])
  assert.deepEqual(await provider.evaluate(request, signal), {
    model: build,
    usage: { inputTokens: 222, outputTokens: 3 },
    answers: {
      refund: { status: 'ok', answer: { type: 'noul', probabilityTrue: 0.8 } },
      team: { status: 'ok', answer: { type: 'choice', value: 'billing', probabilities: { billing: 0.9, technical: 0.1 } } },
      urgency: { status: 'ok', answer: { type: 'score', value: 0.85, levels: ['Can wait', 'Today'], probabilities: [0.15, 0.85] } },
    },
  })
})

test('OpenRouter separates a refused question from an incomplete distribution without discarding good siblings', async () => {
  const provider = withResponse({
    ...raw,
    answers: { refund: { type: 'refusal' }, team: raw.answers.team, urgency: { type: 'score', score: 0.85 } },
  })
  const { answers } = await provider.evaluate(request, signal)
  assert.deepEqual(answers.refund, { status: 'error', error: { code: 'provider_error', message: 'OpenRouter refused to answer this question.' } })
  assert.deepEqual(answers.team, {
    status: 'ok', answer: { type: 'choice', value: 'billing', probabilities: { billing: 0.9, technical: 0.1 } },
  })
  assert.deepEqual(answers.urgency, {
    status: 'error', error: { code: 'invalid_response', message: 'OpenRouter returned an incomplete probability distribution.' },
  })
})

test('OpenRouter rejects a different route, nonzero charges, BYOK, and requests outside the allowlist', async () => {
  const invalidRoute = (error: unknown) => error instanceof System1ProviderError &&
    error.detail.code === 'invalid_response' && error.disposition === 'stop'
  for (const reply of [
    { ...raw, model: 'perplexity/pplx-decider-v1.3' },
    { ...raw, provider: 'Unexpected' },
    { ...raw, usage: { ...raw.usage, cost: 0.001 } },
    { ...raw, usage: { ...raw.usage, is_byok: true } },
    { ...raw, usage: { input_tokens: 222, output_tokens: 3 } },
  ]) await assert.rejects(withResponse(reply).evaluate(request, signal), invalidRoute)

  const untouched = createOpenRouterProvider({ resolveApiKey: () => assert.fail('Unsupported inputs must not access a key') })
  for (const input of [
    { ...request, model: 'perplexity/pplx-decider-v1.3' },
    { ...request, images: [{ mediaType: 'image/png' as const, data: 'eA==' }] },
    { ...request, questions: { box: { type: 'box' as const, instructions: 'Find label' } } },
  ]) await assert.rejects(untouched.evaluate(input, signal), (error: unknown) =>
    error instanceof System1ProviderError && error.detail.code === 'unsupported' && error.requestSent === false)
})
