import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Context } from '@deepseek-ai/cordis'
import type { ProviderRequest } from '../src/contracts/index.js'
import { System1ProviderError } from '../src/contracts/error.js'
import System1Service from '../src/index.js'
import { createCloudflareProvider } from '../src/providers/cloudflare/adapter.js'
import * as cloudflare from '../src/providers/cloudflare/index.js'

test('Cloudflare Clef sends the REST contract and normalizes the System One result', async () => {
  const request: ProviderRequest = {
    requestId: 'fixture',
    model: '@cf/cloudflare/clef',
    state: { ticket: 'refund question' },
    questions: {
      urgent: { type: 'noul', instructions: 'Is it urgent?' },
      team: {
        type: 'choice',
        instructions: 'Choose a team',
        criteria: { billing: 'Billing', support: 'Support' },
      },
      severity: {
        type: 'score',
        instructions: 'Rate the impact',
        criteria: ['low', 'high'],
      },
      extra: { type: 'noul', instructions: 'Is the extra signal present?' },
    },
  }
  let called = false
  const provider = createCloudflareProvider({
    apiKey: 'fixture-token',
    accountId: 'account/fixture',
    baseURL: 'https://api.cloudflare.test/client/v4/',
    fetch: async (input, init) => {
      called = true
      assert.equal(
        String(input),
        'https://api.cloudflare.test/client/v4/accounts/account%2Ffixture/ai/run/@cf/cloudflare/clef',
      )
      assert.equal(init?.method, 'POST')
      assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer fixture-token')
      assert.deepEqual(JSON.parse(String(init?.body)), {
        model: 'clef',
        state: request.state,
        questions: request.questions,
      })
      return Response.json({
        result: {
          model: 'clef',
          answers: {
            urgent: { type: 'noul', noul: 0.9 },
            team: {
              type: 'choice',
              choice: 'billing',
              probabilities: { billing: 0.8, support: 0.2 },
            },
            severity: {
              type: 'score',
              score: 0.25,
              probabilities: { 0: 0.75, 1: 0.25 },
            },
            extra: { type: 'noul', noul: 'bad' },
          },
          usage: { input_tokens: 12, output_tokens: 5 },
        },
        success: true,
        errors: [],
        messages: [],
      })
    },
  })

  assert.deepEqual(await provider.describe('clef', new AbortController().signal), {
    primitives: ['noul', 'choice', 'score'],
    maxQuestions: 64,
    context: { maxTokens: 65_536, includesQuestions: true },
  })
  const result = await provider.evaluate(request, new AbortController().signal)
  assert.equal(called, true)
  assert.deepEqual(result.answers, {
    urgent: { status: 'ok', answer: { type: 'noul', probabilityTrue: 0.9 } },
    team: {
      status: 'ok',
      answer: {
        type: 'choice',
        value: 'billing',
        probabilities: { billing: 0.8, support: 0.2 },
      },
    },
    severity: {
      status: 'ok',
      answer: {
        type: 'score',
        value: 0.25,
        levels: ['low', 'high'],
        probabilities: [0.75, 0.25],
      },
    },
    extra: {
      status: 'error',
      error: { code: 'invalid_response', message: 'Provider returned an invalid answer.' },
    },
  })
  assert.deepEqual(result.usage, { inputTokens: 12, outputTokens: 5 })
})

test('Cloudflare rejects incomplete credentials and unsuccessful REST envelopes safely', async () => {
  let calls = 0
  const request: ProviderRequest = {
    requestId: 'fixture',
    model: 'clef-flash',
    state: 'sample',
    questions: { q: { type: 'noul', instructions: 'yes?' } },
  }
  const missing = createCloudflareProvider({
    apiKey: 'fixture-token',
    fetch: async () => {
      calls++
      return Response.json({})
    },
  })
  await assert.rejects(
    missing.evaluate(request, new AbortController().signal),
    (error: unknown) =>
      error instanceof System1ProviderError && error.detail.code === 'unavailable',
  )
  assert.equal(calls, 0)

  const provider = createCloudflareProvider({
    apiKey: 'fixture-token',
    accountId: 'fixture-account',
    fetch: async () => Response.json({
      success: false,
      errors: [{ message: 'sensitive implementation details' }],
    }),
  })
  await assert.rejects(
    provider.evaluate(request, new AbortController().signal),
    (error: unknown) =>
      error instanceof System1ProviderError &&
      error.detail.code === 'provider_error' &&
      !error.message.includes('sensitive'),
  )
})

test('Cloudflare classifies HTTP errors and passes abort signals to fetch', async () => {
  const request: ProviderRequest = {
    requestId: 'fixture',
    model: 'clef',
    state: 'sample',
    questions: { q: { type: 'noul', instructions: 'yes?' } },
  }
  for (const [status, code, retryable] of [
    [401, 'unavailable', false],
    [429, 'provider_error', true],
    [503, 'provider_error', true],
  ] as const) {
    const provider = createCloudflareProvider({
      apiKey: 'fixture-token',
      accountId: 'fixture-account',
      fetch: async () => new Response('sensitive body', { status }),
    })
    await assert.rejects(
      provider.evaluate(request, new AbortController().signal),
      (error: unknown) =>
        error instanceof System1ProviderError &&
        error.detail.code === code &&
        error.detail.retryable === retryable &&
        error.detail.httpStatus === status &&
        !error.message.includes('sensitive'),
    )
  }

  const controller = new AbortController()
  const provider = createCloudflareProvider({
    apiKey: 'fixture-token',
    accountId: 'fixture-account',
    fetch: async (_input, init) => {
      assert.equal(init?.signal, controller.signal)
      controller.abort()
      throw new DOMException('aborted', 'AbortError')
    },
  })
  await assert.rejects(provider.evaluate(request, controller.signal), { name: 'AbortError' })
})

test('Cloudflare plugin unregisters its provider when disposed', async (t) => {
  const ctx = new Context()
  const system = await ctx.plugin(System1Service, {
    defaultModel: { provider: 'cloudflare-test', model: 'clef' },
  })
  t.after(async () => system.dispose())
  const previousToken = process.env.DSH_SYSTEM1_CLOUDFLARE_TEST_TOKEN
  const previousAccount = process.env.CLOUDFLARE_ACCOUNT_ID
  process.env.DSH_SYSTEM1_CLOUDFLARE_TEST_TOKEN = 'fixture-token'
  delete process.env.CLOUDFLARE_ACCOUNT_ID
  t.after(() => {
    if (previousToken === undefined) delete process.env.DSH_SYSTEM1_CLOUDFLARE_TEST_TOKEN
    else process.env.DSH_SYSTEM1_CLOUDFLARE_TEST_TOKEN = previousToken
    if (previousAccount === undefined) delete process.env.CLOUDFLARE_ACCOUNT_ID
    else process.env.CLOUDFLARE_ACCOUNT_ID = previousAccount
  })
  const plugin = await ctx.plugin(cloudflare, {
    id: 'cloudflare-test',
    apiKeyEnv: 'DSH_SYSTEM1_CLOUDFLARE_TEST_TOKEN',
    baseURL: 'https://api.cloudflare.test/client/v4',
  })
  t.after(async () => plugin.dispose())
  const before = await ctx.system1.decide({
    state: 'sample',
    questions: { q: { type: 'noul', instructions: 'yes?' } },
  })
  assert.deepEqual(before.answers.q, {
    status: 'error',
    error: {
      code: 'unavailable',
      message: 'Cloudflare API token and account ID are required.',
    },
  })
  await plugin.dispose()
  const after = await ctx.system1.decide({
    state: 'sample',
    questions: { q: { type: 'noul', instructions: 'yes?' } },
  })
  assert.deepEqual(after.answers.q, {
    status: 'error',
    error: { code: 'unavailable', message: 'Requested provider is not registered.' },
  })
})
