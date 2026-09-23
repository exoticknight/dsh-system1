import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { Context } from '@deepseek-ai/cordis'
import System1Service from '../src/index.js'
import * as typesafe from '../src/providers/typesafe/index.js'

test('real HTTP transport and plugin mount preserve three primitives and structured JSON', async (t) => {
  const questions = {
    yes: {
      type: 'noul',
      instructions: { text: 'yes?' },
      criteria: { true: { meaning: 'yes' } },
    },
    topic: {
      type: 'choice',
      instructions: 'topic?',
      criteria: { a: { label: 'A' }, b: null },
    },
    level: { type: 'score', instructions: 'level?', criteria: ['low', 'high'] },
  } as const
  const server = createServer(async (req, res) => {
    assert.equal(req.url, '/v1/systemone')
    assert.equal(req.headers.authorization, 'Bearer fixture-only')
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    assert.deepEqual(JSON.parse(Buffer.concat(chunks).toString()), {
      model: 'jev-1.13.0',
      state: { text: 'sample' },
      questions,
    })
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        model: 'jev-1.13.0',
        usage: { input_tokens: 4, output_tokens: 3 },
        answers: {
          yes: { type: 'noul', noul: 0.9 },
          topic: {
            type: 'choice',
            choice: 'a',
            probabilities: { a: 0.8, b: 0.2 },
            confidence: 0.8,
          },
          level: {
            type: 'score',
            score: 0.3,
            legend: { 0: 'low', 1: 'high' },
            probabilities: { 1: 0.3, 0: 0.7 },
            confidence: 0.7,
          },
        },
      }),
    )
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(() => {
    server.closeAllConnections()
    server.close()
  })
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  const ctx = new Context()
  const root = await ctx.plugin(System1Service, {
    defaultModel: { provider: 'fixture', model: 'jev-1.13.0' },
  })
  t.after(async () => {
    await root.dispose()
  })
  const previous = process.env.DSH_SYSTEM1_FIXTURE_KEY
  process.env.DSH_SYSTEM1_FIXTURE_KEY = 'fixture-only'
  t.after(() => {
    if (previous === undefined) delete process.env.DSH_SYSTEM1_FIXTURE_KEY
    else process.env.DSH_SYSTEM1_FIXTURE_KEY = previous
  })
  const plugin = await ctx.plugin(typesafe, {
    id: 'fixture',
    apiKeyEnv: 'DSH_SYSTEM1_FIXTURE_KEY',
    baseURL: `http://127.0.0.1:${address.port}`,
  })
  t.after(async () => {
    await plugin.dispose()
  })
  const result = await ctx.system1.decide({
    state: { text: 'sample' },
    questions,
  })
  assert.deepEqual(result.answers.yes, {
    status: 'ok',
    answer: { type: 'noul', probabilityTrue: 0.9 },
  })
  assert.deepEqual(result.answers.topic, {
    status: 'ok',
    answer: {
      type: 'choice',
      value: 'a',
      probabilities: { a: 0.8, b: 0.2 },
      confidence: 0.8,
    },
  })
  assert.deepEqual(result.answers.level, {
    status: 'ok',
    answer: {
      type: 'score',
      value: 0.3,
      levels: ['low', 'high'],
      probabilities: [0.7, 0.3],
      confidence: 0.7,
    },
  })
  assert.deepEqual(result.meta.usage, { inputTokens: 4, outputTokens: 3 })
  await plugin.dispose()
  const after = await ctx.system1.decide({ state: null, questions })
  assert.equal(
    after.answers.yes.status === 'error' && after.answers.yes.error.code,
    'unavailable',
  )
})

test('TypeSafe sanitizes HTTP errors and missing credentials', async (t) => {
  const ctx = new Context()
  const fiber = await ctx.plugin(System1Service, {
    defaultModel: { provider: 'test', model: 'jev-1.13.0' },
  })
  t.after(async () => {
    await fiber.dispose()
  })
  let calls = 0
  const fetchFn: typeof fetch = async () => {
    calls++
    return new Response('secret server body', { status: 429 })
  }
  let remove = ctx.system1.registerProvider(
    'test',
    typesafe.createTypesafeProvider({ apiKey: '', fetch: fetchFn }),
  )
  const request = {
    state: 'sample',
    questions: { q: { type: 'noul', instructions: '?' } },
  } as const
  const missing = await ctx.system1.decide(request)
  assert.equal(
    missing.answers.q.status === 'error' && missing.answers.q.error.code,
    'unavailable',
  )
  assert.equal(calls, 0)
  remove()
  remove = ctx.system1.registerProvider(
    'test',
    typesafe.createTypesafeProvider({ apiKey: 'fixture-only', fetch: fetchFn }),
  )
  const error = await ctx.system1.decide(request)
  assert.deepEqual(error.answers.q, {
    status: 'error',
    error: {
      code: 'provider_error',
      message: 'TypeSafe request failed.',
      httpStatus: 429,
      retryable: true,
    },
  })
  assert.ok(!JSON.stringify(error).includes('secret'))
  remove()
  ctx.system1.registerProvider(
    'test',
    typesafe.createTypesafeProvider({
      apiKey: 'fixture-only',
      fetch: async () => new Response('{bad'),
    }),
  )
  const invalid = await ctx.system1.decide(request)
  assert.equal(
    invalid.answers.q.status === 'error' && invalid.answers.q.error.code,
    'invalid_response',
  )
})

test('preserves selected choice independently of ranking and rejects mismatched score labels', async (t) => {
  const ctx = new Context()
  const fiber = await ctx.plugin(System1Service, {
    defaultModel: { provider: 'test', model: 'jev-1.13.0' },
  })
  t.after(async () => {
    await fiber.dispose()
  })
  let calls = 0
  ctx.system1.registerProvider(
    'test',
    typesafe.createTypesafeProvider({
      apiKey: 'fixture-only',
      fetch: async () => {
        calls++
        return Response.json({
          model: 'jev-1.13.0',
          usage: { input_tokens: 1, output_tokens: 1 },
          answers: {
            q: {
              type: 'choice',
              choice: 'a',
              probabilities: { a: 0.2, b: 0.8 },
            },
            s: {
              type: 'score',
              score: 0.3,
              legend: { 0: 'high', 1: 'low' },
              probabilities: { 0: 0.7, 1: 0.3 },
            },
          },
        })
      },
    }),
  )
  const questions = {
    q: { type: 'choice', instructions: '?', criteria: { a: 'A', b: 'B' } },
    s: { type: 'score', instructions: '?', criteria: ['low', 'high'] },
  } as const
  const result = await ctx.system1.decide({ state: 'sample', questions })
  assert.equal(
    result.answers.q.status === 'ok' && result.answers.q.answer.value,
    'a',
  )
  assert.equal(
    result.answers.s.status === 'error' && result.answers.s.error.code,
    'invalid_response',
  )
  const unknown = await ctx.system1.decide({
    state: 'sample',
    questions,
    model: { provider: 'test', model: 'unknown' },
  })
  assert.equal(
    unknown.answers.q.status === 'error' && unknown.answers.q.error.code,
    'unsupported',
  )
  assert.equal(calls, 1)
})
