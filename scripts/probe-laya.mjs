import assert from 'node:assert/strict'
import { Context } from '@deepseek-ai/cordis'
import System1Service from '../lib/index.js'
import * as laya from '../lib/providers/laya/index.js'

const baseURL = process.env.LAYA_BASE_URL || 'http://127.0.0.1:8000'
const model = process.env.LAYA_MODEL || 'auto'
const timeoutMs = Number(process.env.LAYA_TIMEOUT_MS || 60000)
const apiKey = process.env.LAYA_API_KEY?.trim()
const questions = {
  refund: {
    type: 'noul',
    instructions: '这条请求是否涉及退款？',
  },
  topic: {
    type: 'choice',
    instructions: '选择最相关的请求类别。',
    criteria: {
      billing: '账单、重复扣款或退款',
      technical: '产品故障或技术支持',
    },
  },
  urgency: {
    type: 'score',
    instructions: '评估这条请求的紧急程度。',
    criteria: ['常规', '紧急', '严重'],
  },
}
const state = '客户说：我上个月被重复扣款两次，请尽快退还。'
const selectedModel = { provider: 'laya', model }
const rawResponses = []
const originalFetch = globalThis.fetch
const ctx = new Context()
let service
let provider

try {
  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input))
    const response = await originalFetch(input, init)
    if (url.pathname === '/v1/systemone' && response.ok) {
      const raw = await response.clone().json()
      rawResponses.push({
        model: typeof raw.model === 'string' ? raw.model : undefined,
        routingModel: typeof raw.routing?.model === 'string'
          ? raw.routing.model
          : undefined,
      })
    }
    return response
  }
  service = await ctx.plugin(System1Service, {
    defaultModel: selectedModel,
    timeoutMs,
  })
  provider = await ctx.plugin(laya, {
    id: 'laya',
    apiKeyEnv: 'LAYA_API_KEY',
    baseURL,
  })

  const healthResponse = await originalFetch(`${baseURL.replace(/\/+$/u, '')}/health`, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    signal: AbortSignal.timeout(10000),
  })
  assert.equal(healthResponse.ok, true, `Laya health returned HTTP ${healthResponse.status}`)
  const health = await healthResponse.json()
  assert.equal(health.status, 'ok')

  const cancelled = await ctx.system1.decide({
    state,
    questions: { q: { type: 'noul', instructions: '是否涉及退款？' } },
    model: selectedModel,
    signal: AbortSignal.abort(),
  })
  assert.equal(cancelled.answers.q.status, 'error')
  assert.equal(cancelled.answers.q.error.code, 'cancelled')

  const unsupported = await ctx.system1.decide({
    state,
    questions: { q: { type: 'noul', instructions: '是否涉及退款？' } },
    model: { provider: 'laya', model: '__probe_unsupported__' },
  })
  assert.equal(unsupported.answers.q.status, 'error')
  assert.equal(unsupported.answers.q.error.code, 'unsupported')

  const started = performance.now()
  const result = await ctx.system1.decide({
    state,
    questions,
    model: selectedModel,
    timeoutMs,
  })
  const latencyMs = performance.now() - started
  assert.equal(result.meta.executed?.provider, 'laya')
  assert.ok(
    typeof result.meta.executed?.model === 'string' && result.meta.executed.model.length > 0,
    'the service should report the model that actually answered',
  )
  for (const [id, type] of Object.entries({ refund: 'noul', topic: 'choice', urgency: 'score' })) {
    assert.equal(result.answers[id]?.status, 'ok', `${id} should have status=ok`)
    assert.equal(result.answers[id].answer.type, type, `${id} should be ${type}`)
  }

  const noul = result.answers.refund.answer
  assertProbability(noul.probabilityTrue, 'noul probability')

  const choice = result.answers.topic.answer
  assert.deepEqual(Object.keys(choice.probabilities).sort(), ['billing', 'technical'])
  assert.ok(Object.hasOwn(choice.probabilities, choice.value))
  assertDistribution(Object.values(choice.probabilities), 'choice probabilities')

  const score = result.answers.urgency.answer
  assert.equal(score.probabilities.length, questions.urgency.criteria.length)
  assertDistribution(score.probabilities, 'score probabilities')
  assert.ok(score.value >= 0 && score.value <= questions.urgency.criteria.length - 1)

  const shortTimeout = await ctx.system1.decide({
    state,
    questions: { q: { type: 'noul', instructions: '是否涉及退款？' } },
    model: selectedModel,
    timeoutMs: 1,
  })
  assert.equal(shortTimeout.answers.q.status, 'error')
  assert.equal(shortTimeout.answers.q.error.code, 'timeout')

  const observed = rawResponses[0]
  assert.ok(observed, 'the service should have received an official Laya HTTP response')
  if (observed.routingModel)
    assert.equal(result.meta.executed.model, observed.routingModel)
  const finalHealthResponse = await originalFetch(`${baseURL.replace(/\/+$/u, '')}/health`, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    signal: AbortSignal.timeout(10000),
  })
  assert.equal(finalHealthResponse.ok, true, `Laya health returned HTTP ${finalHealthResponse.status}`)
  const finalHealth = await finalHealthResponse.json()
  assert.equal(finalHealth.status, 'ok')
  const revisions = finalHealth.revisions ?? {}
  const checkpointDevices = finalHealth.checkpoint_devices ?? {}
  const healthModel = [observed.routingModel, observed.model].find(
    (candidate) => candidate && Object.hasOwn(revisions, candidate),
  )
  assert.ok(
    healthModel,
    'Unable to verify the served checkpoint: Laya response model fields did not match a loaded checkpoint in /health.',
  )
  const checkpointInfo = {
    checkpoint: healthModel,
    revision: revisions[healthModel],
    device: checkpointDevices[healthModel],
  }
  const metadataNote = observed.routingModel && observed.model !== observed.routingModel
    ? 'The top-level response model is a Laya service identifier; routing.model names the selected checkpoint.'
    : undefined
  const output = {
    status: 'verified',
    endpoint: new URL(baseURL).origin,
    requestedModel: model,
    serviceProvider: result.meta.executed.provider,
    serviceModel: result.meta.executed.model,
    responseModel: observed.model,
    routingModel: observed.routingModel,
    ...checkpointInfo,
    ...(metadataNote ? { metadataNote } : {}),
    latencyMs: Math.round(latencyMs),
    answers: {
      refund: { status: result.answers.refund.status, type: noul.type, probabilityTrue: noul.probabilityTrue },
      topic: { status: result.answers.topic.status, type: choice.type, value: choice.value, probabilities: choice.probabilities },
      urgency: { status: result.answers.urgency.status, type: score.type, value: score.value, probabilities: score.probabilities },
    },
    checks: {
      preCancelled: cancelled.answers.q.error.code,
      unsupportedModel: unsupported.answers.q.error.code,
      shortTimeout: shortTimeout.answers.q.error.code,
      note: 'Cancellation ends the client wait; it does not guarantee that CPU inference stops on the server.',
    },
  }
  console.log(JSON.stringify(output, null, 2))
} finally {
  globalThis.fetch = originalFetch
  try {
    await provider?.dispose()
  } finally {
    await service?.dispose()
  }
}

function assertProbability(value, label) {
  assert.ok(Number.isFinite(value) && value >= 0 && value <= 1, `${label} must be in [0, 1]`)
}

function assertDistribution(values, label) {
  assert.ok(values.every((value) => Number.isFinite(value) && value >= 0 && value <= 1), `${label} values must be in [0, 1]`)
  assert.ok(Math.abs(values.reduce((sum, value) => sum + value, 0) - 1) <= 1e-5, `${label} must sum to 1`)
}
