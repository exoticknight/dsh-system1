import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServer, type IncomingHttpHeaders } from 'node:http'
import { once } from 'node:events'
import { Context } from '@deepseek-ai/cordis'
import System1Service from '../../src/index.js'
import * as laya from '../../src/providers/laya/index.js'

const questions = { q: { type: 'noul', instructions: '是否涉及退款？' } } as const

async function setup(t: { after(fn: () => unknown): void }) {
  const ctx = new Context()
  const fiber = await ctx.plugin(System1Service, {
    defaultModel: { provider: 'laya-test', model: 'auto' },
  })
  t.after(async () => {
    await fiber.dispose()
  })
  return ctx
}

test('Laya plugin speaks /v1/systemone without a key and reports the routed checkpoint', async (t) => {
  const seen: { url: string | undefined; headers: IncomingHttpHeaders; body: unknown }[] = []
  const server = createServer(async (req, res) => {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    seen.push({
      url: req.url,
      headers: req.headers,
      body: JSON.parse(Buffer.concat(chunks).toString()),
    })
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({
      model: 'laya-rl-agent',
      routing: { model: 'multilingual' },
      answers: { q: { type: 'noul', noul: 0.8 } },
    }))
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(() => {
    server.closeAllConnections()
    server.close()
  })
  const address = server.address()
  assert.ok(address && typeof address !== 'string')

  const ctx = await setup(t)
  delete process.env.DSH_SYSTEM1_LAYA_TEST_KEY
  const plugin = await ctx.plugin(laya, {
    id: 'laya-test',
    apiKeyEnv: 'DSH_SYSTEM1_LAYA_TEST_KEY',
    baseURL: `http://127.0.0.1:${address.port}/`,
  })
  t.after(async () => {
    await plugin.dispose()
  })

  const result = await ctx.system1.decide({ state: '重复扣款，请退款。', questions })
  assert.deepEqual(result.answers.q, {
    status: 'ok',
    answer: { type: 'noul', probabilityTrue: 0.8 },
  })
  assert.deepEqual(result.meta.executed, { provider: 'laya-test', model: 'multilingual' })
  assert.equal(seen.length, 1)
  assert.equal(seen[0]?.url, '/v1/systemone')
  assert.equal(seen[0]?.headers?.authorization, undefined)
  assert.deepEqual(seen[0]?.body, { state: '重复扣款，请退款。', questions })

  await plugin.dispose()
  const after = await ctx.system1.decide({ state: null, questions })
  assert.equal(
    after.answers.q.status === 'error' && after.answers.q.error.code,
    'unavailable',
  )
})

test('Laya sends explicit models and optional keys, and falls back to the top-level model', async (t) => {
  const ctx = await setup(t)
  let request: { headers: Headers; body: unknown } | undefined
  ctx.system1.registerProvider('laya-test', laya.createLayaProvider({
    apiKey: 'fixture-only',
    fetch: async (_input, init) => {
      request = {
        headers: new Headers(init?.headers),
        body: JSON.parse(String(init?.body)),
      }
      return Response.json({
        model: 'multilingual',
        answers: { q: { type: 'noul', noul: 0.2 } },
      })
    },
  }))
  const result = await ctx.system1.decide({
    state: 'sample',
    questions,
    model: { provider: 'laya-test', model: 'multilingual' },
  })
  assert.equal(result.answers.q.status, 'ok')
  assert.equal(result.meta.executed?.model, 'multilingual')
  assert.equal(request?.headers.get('authorization'), 'Bearer fixture-only')
  assert.deepEqual(request?.body, { model: 'multilingual', state: 'sample', questions })
})

test('Laya rejects unknown models before I/O and sanitizes HTTP errors', async (t) => {
  const ctx = await setup(t)
  let calls = 0
  let status = 503
  ctx.system1.registerProvider('laya-test', laya.createLayaProvider({
    fetch: async () => {
      calls++
      return new Response('sensitive server body', { status })
    },
  }))
  const unsupported = await ctx.system1.decide({
    state: 'sample',
    questions,
    model: { provider: 'laya-test', model: 'unknown' },
  })
  assert.equal(
    unsupported.answers.q.status === 'error' && unsupported.answers.q.error.code,
    'unsupported',
  )
  assert.equal(calls, 0)

  const busy = await ctx.system1.decide({ state: 'sample', questions })
  assert.deepEqual(busy.answers.q, {
    status: 'error',
    error: {
      code: 'provider_error',
      message: 'Laya request failed.',
      httpStatus: 503,
      retryable: true,
    },
  })
  assert.ok(!JSON.stringify(busy).includes('sensitive'))

  status = 401
  const denied = await ctx.system1.decide({ state: 'sample', questions })
  assert.equal(
    denied.answers.q.status === 'error' && denied.answers.q.error.code,
    'unavailable',
  )
})
