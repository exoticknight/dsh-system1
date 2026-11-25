import { decideOperation } from '../../src/index.js'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ProviderRequest } from '../../src/contracts/index.js'
import { System1ProviderError } from '../../src/contracts/error.js'
import { System1Engine } from '../../src/core/engine.js'
import { createLiquidProvider } from '../../src/providers/liquid/adapter.js'

const request = {
  model: 'd1.2-ultra',
  requestId: 'fixture',
  state: { description: 'Check the attached recording and photo.' },
  questions: { q: { type: 'noul', instructions: 'Is the greeting in English?' } },
  images: [{ mediaType: 'image/png', data: 'YQ==' }],
  audio: [{ mediaType: 'audio/wav', data: 'Yg==' }],
} as const satisfies ProviderRequest

test('Liquid sends the chosen model and media with the existing typed decision contract', async () => {
  const engine = new System1Engine({ defaultModel: { provider: 'liquid', model: request.model } })
  engine.registerImplementation(decideOperation, 'liquid', createLiquidProvider({
    apiKey: 'fixture-only',
    fetch: async (url, init) => {
      assert.equal(String(url), 'https://api.liquid.ai/decisions/v1/systemone')
      assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer fixture-only')
      assert.equal(init?.redirect, 'error')
      assert.deepEqual(JSON.parse(String(init?.body)), {
        model: request.model,
        state: request.state,
        questions: request.questions,
        images: [{ content_type: 'image/png', base64: 'YQ==' }],
        audio: [{ content_type: 'audio/wav', base64: 'Yg==' }],
      })
      return Response.json({ model: request.model, answers: { q: { type: 'noul', noul: 0.91 } } })
    },
  }))
  const result = await engine.decide({
    state: request.state, questions: request.questions, images: request.images, audio: request.audio,
  })
  assert.equal(result.meta.executed?.model, request.model)
  assert.deepEqual(result.answers.q, { status: 'ok', answer: { type: 'noul', probabilityTrue: 0.91 } })
})

test('Liquid rejects an oversized encoded body before fetching', async () => {
  let calls = 0
  const provider = createLiquidProvider({ apiKey: 'fixture-only', fetch: async () => {
    calls += 1
    return Response.json({})
  } })
  await assert.rejects(
    provider.evaluate({
      ...request,
      images: [{ mediaType: 'image/png', data: 'AAAA'.repeat(1_125_000) }],
    }, AbortSignal.timeout(1_000)),
    (error: unknown) => error instanceof System1ProviderError && error.detail.code === 'limit_exceeded',
  )
  assert.equal(calls, 0)
})
