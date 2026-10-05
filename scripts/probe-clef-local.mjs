import assert from 'node:assert/strict'
import { Context } from '@deepseek-ai/cordis'
import System1Service from '../lib/index.js'
import * as cloudflare from '../lib/providers/cloudflare/index.js'

const revision = '17f0b0ad64efb65d273590632833508766b2aae6'
const accountId = 'local-probe-account'
const apiKey = 'local-probe-token'
const port = Number(process.env.CLEF_LOCAL_PORT || 8765)
assert.ok(Number.isInteger(port) && port >= 1 && port <= 65535, 'CLEF_LOCAL_PORT must be a valid port')

const baseURL = `http://127.0.0.1:${port}/client/v4`
const origin = `http://127.0.0.1:${port}`
assert.equal(new URL(baseURL).hostname, '127.0.0.1')

const state = 'A customer says a refund has been pending for two weeks and asks for help.'
const questions = {
  refund_request: {
    type: 'noul',
    instructions: 'Is the customer asking about a refund?',
  },
  support_team: {
    type: 'choice',
    instructions: 'Choose the best support team.',
    criteria: {
      billing: 'Payments, invoices, and refunds',
      technical: 'Product errors or outages',
      sales: 'Plans, renewals, and upgrades',
    },
  },
  urgency: {
    type: 'score',
    instructions: 'Rate how urgently this case needs attention.',
    criteria: ['Routine', 'Soon', 'Urgent'],
  },
}

const localFetch = (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input))
  assert.equal(url.origin, origin, 'probe is restricted to the configured loopback service')
  return globalThis.fetch(input, { ...init, redirect: 'error' })
}

const ctx = new Context()
let service
let removeProvider

try {
  service = await ctx.plugin(System1Service, {
    defaultModel: { provider: 'cloudflare', model: 'clef-flash' },
    timeoutMs: 300000,
  })
  const provider = cloudflare.createCloudflareProvider({
    apiKey,
    accountId,
    baseURL,
    fetch: localFetch,
  })
  removeProvider = ctx.system1.registerProvider('cloudflare', provider)

  const healthResponse = await localFetch(`${origin}/health`, {
    signal: AbortSignal.timeout(10000),
  })
  assert.equal(healthResponse.ok, true, `local health returned HTTP ${healthResponse.status}`)
  const health = await healthResponse.json()
  assert.equal(health.status, 'ok')
  assert.equal(health.loaded, true)
  assert.equal(health.model, 'clef-flash')
  assert.equal(health.revision, revision)
  const runtime = health.runtime
  assert.ok(runtime, 'health should expose observed model runtime metadata')
  assert.equal(runtime.quantization.loaded_in_4bit, true)
  assert.equal(runtime.quantization.bits, 4)
  assert.equal(runtime.quantization.scheme, 'nf4')
  assert.equal(runtime.quantization.double_quant, true)
  assert.equal(runtime.quantization.compute_dtype, 'bfloat16')
  assert.ok(runtime.quantization.quantized_linear_layers > 0)
  assert.equal(typeof runtime.backbone_first_parameter_device, 'string')
  assert.equal(runtime.head.dtype, 'bfloat16')
  assert.equal(typeof runtime.head.device, 'string')
  const expectedDevice = health.device === 'cuda' ? 'cuda:0' : health.device
  assert.equal(runtime.backbone_first_parameter_device, expectedDevice)
  assert.equal(runtime.head.device, expectedDevice)

  const started = performance.now()
  const result = await ctx.system1.decide({ state, questions, timeoutMs: 300000 })
  const latencyMs = Math.round(performance.now() - started)

  assert.equal(result.meta.executed?.provider, 'cloudflare')
  assert.equal(result.meta.executed?.model, 'clef-flash')

  const noul = result.answers.refund_request
  assert.equal(noul.status, 'ok', 'noul should have status=ok')
  assert.equal(noul.answer.type, 'noul')
  assertProbability(noul.answer.probabilityTrue, 'noul probability')

  const choice = result.answers.support_team
  assert.equal(choice.status, 'ok', 'choice should have status=ok')
  assert.equal(choice.answer.type, 'choice')
  assert.ok(Object.hasOwn(questions.support_team.criteria, choice.answer.value))
  assert.deepEqual(Object.keys(choice.answer.probabilities).sort(), ['billing', 'sales', 'technical'])
  assertDistribution(Object.values(choice.answer.probabilities), 'choice probabilities')

  const score = result.answers.urgency
  assert.equal(score.status, 'ok', 'score should have status=ok')
  assert.equal(score.answer.type, 'score')
  assert.equal(score.answer.probabilities.length, questions.urgency.criteria.length)
  assertDistribution(score.answer.probabilities, 'score probabilities')
  assert.ok(score.answer.value >= 0 && score.answer.value <= questions.urgency.criteria.length - 1)

  console.log(JSON.stringify({
    status: 'verified',
    latencyMs,
    serviceModel: result.meta.executed.model,
    revision: health.revision,
    runtime: {
      quantization: runtime.quantization,
      backboneFirstParameterDevice: runtime.backbone_first_parameter_device,
      head: runtime.head,
    },
    primitives: {
      noul: {
        status: noul.status,
        type: noul.answer.type,
        probabilityTrue: noul.answer.probabilityTrue,
      },
      choice: {
        status: choice.status,
        type: choice.answer.type,
        value: choice.answer.value,
        probabilities: choice.answer.probabilities,
      },
      score: {
        status: score.status,
        type: score.answer.type,
        value: score.answer.value,
        probabilities: score.answer.probabilities,
      },
    },
  }, null, 2))
} catch (error) {
  const code = error && typeof error === 'object' && 'code' in error
    ? String(error.code)
    : 'probe_failed'
  console.log(JSON.stringify({ status: 'failed', code }))
  process.exitCode = 1
} finally {
  removeProvider?.()
  await service?.dispose()
}

function assertProbability(value, label) {
  assert.ok(Number.isFinite(value) && value >= 0 && value <= 1, `${label} must be in [0, 1]`)
}

function assertDistribution(values, label) {
  assert.ok(values.every((value) => Number.isFinite(value) && value >= 0 && value <= 1), `${label} values must be in [0, 1]`)
  assert.ok(Math.abs(values.reduce((sum, value) => sum + value, 0) - 1) <= 0.002, `${label} must sum to 1`)
}
