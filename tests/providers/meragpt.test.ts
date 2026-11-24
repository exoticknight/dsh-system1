import assert from 'node:assert/strict'
import { test } from 'node:test'
import { System1Engine } from '../../src/core/engine.js'
import { Context } from '@deepseek-ai/cordis'
import { System1ProviderError } from '../../src/contracts/error.js'
import type { ProviderRequest } from '../../src/contracts/index.js'
import System1Service from '../../src/index.js'
import { createMeraGptProvider } from '../../src/providers/meragpt/adapter.js'
import * as meragpt from '../../src/providers/meragpt/index.js'
import { MERAGPT_MODELS } from '../../src/providers/meragpt/models.js'

const request: ProviderRequest = {
  requestId: 'fixture',
  model: 'decider-1',
  state: { ticket: 'Charged twice; wants a refund.' },
  questions: {
    refund: { type: 'noul', instructions: 'Is a refund requested?' },
    team: {
      type: 'choice',
      instructions: 'Which team should handle this?',
      criteria: { billing: 'Payments and refunds.', support: 'Product usage.' },
    },
    urgency: {
      type: 'score',
      instructions: 'How urgent is this?',
      criteria: ['Can wait', 'Today'],
    },
  },
}

test('meraGPT Decider sends the System One request and normalizes all answers', async () => {
  const provider = createMeraGptProvider({
    apiKey: 'fixture-only',
    baseURL: 'https://meragpt.fixture/',
    fetch: async (input, init) => {
      assert.equal(String(input), 'https://meragpt.fixture/v1/systemone')
      assert.equal(init?.method, 'POST')
      assert.equal(init?.redirect, 'error')
      assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer fixture-only')
      assert.deepEqual(JSON.parse(String(init?.body)), {
        model: 'decider-1',
        state: request.state,
        questions: request.questions,
      })
      return Response.json({
        id: 'req_fixture',
        object: 'systemone',
        model: 'decider-1',
        answers: {
          refund: { type: 'noul', noul: 0.98 },
          team: {
            type: 'choice',
            choice: 'billing',
            confidence: 0.91,
            probabilities: { billing: 0.91, support: 0.09 },
          },
          urgency: {
            type: 'score',
            score: 0.75,
            confidence: 0.75,
            legend: { 0: 'Can wait', 1: 'Today' },
            probabilities: { 0: 0.25, 1: 0.75 },
          },
        },
        usage: { input_tokens: 52, output_tokens: 0, cost_usd: '$0.00000208' },
        balance_usd: '$1.00',
      })
    },
  })

  const result = await provider.evaluate(request, new AbortController().signal)
  assert.deepEqual(result, {
    model: 'decider-1',
    answers: {
      refund: { status: 'ok', answer: { type: 'noul', probabilityTrue: 0.98 } },
      team: {
        status: 'ok',
        answer: {
          type: 'choice',
          value: 'billing',
          probabilities: { billing: 0.91, support: 0.09 },
          confidence: 0.91,
        },
      },
      urgency: {
        status: 'ok',
        answer: {
          type: 'score',
          value: 0.75,
          levels: ['Can wait', 'Today'],
          probabilities: [0.25, 0.75],
          confidence: 0.75,
        },
      },
    },
    usage: { inputTokens: 52, outputTokens: 0 },
  })
})

test('meraGPT declares the published limits and canonicalizes model aliases', async () => {
  assert.deepEqual(MERAGPT_MODELS, [
    { id: 'decider-1', aliases: ['sd-1', 'state-decider-1'] },
    { id: 'decider-1.1' },
  ])
  const provider = createMeraGptProvider({
    apiKey: 'fixture-only',
    fetch: async (_input, init) => {
      assert.equal(JSON.parse(String(init?.body)).model, 'decider-1')
      return Response.json({
        model: 'decider-1',
        answers: { q: { type: 'noul', noul: 0.8 } },
      })
    },
  })

  assert.equal(provider.timeoutMs(), 10_000)
  assert.deepEqual(await provider.describe('sd-1', new AbortController().signal), {
    primitives: ['noul', 'choice', 'score'],
    maxQuestions: 64,
    maxChoiceOptions: 255,
    maxScoreLevels: 32,
    images: {
      formats: ['image/png', 'image/jpeg', 'image/webp'],
      maxCount: 8,
      maxBytesPerImage: 8_000_000,
      maxTotalBytes: 64_000_000,
    },
    context: { maxTokens: 32_768, includesQuestions: false, maxStatePlusQuestionTokens: 32_768 },
  })
  const result = await provider.evaluate({ ...request, model: 'sd-1' }, new AbortController().signal)
  assert.equal(result.model, 'decider-1')
})

test('meraGPT requires an API key and sanitizes paid/quota and transient errors', async () => {
  let calls = 0
  const provider = createMeraGptProvider({ fetch: async (_input, init) => {
    calls++
    assert.equal(new Headers(init?.headers).has('authorization'), false)
    return Response.json({ error: { message: 'private account details' } }, { status: 402 })
  } })
  await assert.rejects(
    provider.evaluate(request, new AbortController().signal),
    (error: unknown) => error instanceof System1ProviderError &&
      error.detail.code === 'unavailable' &&
      error.detail.message === 'meraGPT API key is not configured.',
  )
  assert.equal(calls, 0)

  const keyed = createMeraGptProvider({
    apiKey: 'fixture-only',
    fetch: async () => Response.json({ error: { message: 'private account details' } }, { status: 402 }),
  })
  await assert.rejects(
    keyed.evaluate(request, new AbortController().signal),
    (error: unknown) => error instanceof System1ProviderError &&
      error.detail.code === 'provider_error' &&
      error.detail.httpStatus === 402 &&
      !error.detail.retryable &&
      !error.message.includes('private account details'),
  )

  const busy = createMeraGptProvider({
    apiKey: 'fixture-only',
    fetch: async () => Response.json({}, { status: 429 }),
  })
  await assert.rejects(
    busy.evaluate(request, new AbortController().signal),
    (error: unknown) => error instanceof System1ProviderError &&
      error.detail.code === 'provider_error' &&
      error.detail.httpStatus === 429 &&
      error.detail.retryable,
  )
})

test('meraGPT component registers its configured provider without resolving a credential', async (t) => {
  const ctx = new Context()
  const service = await ctx.plugin(System1Service, {
    defaultModel: { provider: 'meragpt-test', model: 'not-supported' },
  })
  t.after(async () => { await service.dispose() })
  const plugin = await ctx.plugin(meragpt, {
    id: 'meragpt-test',
    apiKeyEnv: 'DSH_SYSTEM1_MERAGPT_TEST_KEY',
    baseURL: 'https://meragpt.fixture',
  })
  t.after(async () => { await plugin.dispose() })

  const result = await ctx.system1.decide({
    state: null,
    questions: { q: { type: 'noul', instructions: 'Is this a test?' } },
  })
  assert.deepEqual(result.answers.q, {
    status: 'error',
    error: { code: 'unsupported', message: 'meraGPT model is not supported.' },
  })
})

test('Decider 1.1 sends the fixed ID and embeds attachments without changing the state', async () => {
  const state = { images: 'existing state field', message: 'Receipt attached' }
  const levels = ['Can wait a week', 'Within a few days', 'Today', 'Immediately']
  const engine = new System1Engine({ defaultModel: { provider: 'meragpt', model: 'decider-1.1' } })
  engine.registerProvider('meragpt', createMeraGptProvider({
    apiKey: 'fixture-only',
    fetch: async (_input, init) => {
      const body = JSON.parse(String(init?.body))
      assert.equal(body.model, 'decider-1.1')
      assert.deepEqual(body.state, {
        state,
        images: [{ type: 'image_url', image_url: { url: 'data:image/webp;base64,YQ==' } }],
      })
      return Response.json({
        model: 'decider-1.1',
        answers: {
          q: {
            type: 'score',
            score: 2.0464,
            probabilities: { 0: 0.0448, 1: 0.1895, 2: 0.4405, 3: 0.3253 },
            legend: Object.fromEntries(levels.map((level, index) => [index, level])),
          },
        },
      })
    },
  }))
  const result = await engine.decide({
    state,
    images: [{ mediaType: 'image/webp', data: 'YQ==' }],
    questions: { q: { type: 'score', instructions: 'Rate urgency', criteria: levels } },
  })
  assert.equal(result.meta.executed?.model, 'decider-1.1')
  assert.equal(result.answers.q.status, 'ok')
  if (result.answers.q.status === 'ok')
    assert.ok(Math.abs(result.answers.q.answer.probabilities.reduce((sum, p) => sum + p, 0) - 1) < 1e-12)
})

test('Decider score rounding at 32 levels preserves a valid answer and rejects a far-off score', async () => {
  const levels = Array.from({ length: 32 }, (_, i) => String(i))
  const probabilities = Object.fromEntries(levels.map((level, i) => [level, i === 31 ? 0.9985 : 0]))
  const question = { type: 'score', instructions: 'Select a level', criteria: levels } as const
  const engine = new System1Engine({ defaultModel: { provider: 'meragpt', model: 'decider-1.1' } })
  engine.registerProvider('meragpt', createMeraGptProvider({
    apiKey: 'fixture-only',
    fetch: async () => Response.json({ answers: {
      valid: { type: 'score', score: 30.9757, probabilities },
      invalid: { type: 'score', score: 30, probabilities },
    } }),
  }))
  const result = await engine.decide({ state: 'fixture', questions: { valid: question, invalid: question } })
  assert.equal(result.answers.valid.status === 'ok' && result.answers.valid.answer.value, 31)
  assert.equal(result.answers.invalid.status === 'error' && result.answers.invalid.error.code, 'invalid_response')
})
