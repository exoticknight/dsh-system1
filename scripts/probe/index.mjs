// Live model probe: `pnpm probe <target>` after `pnpm build`.
// Local targets prepare and start their own service on first use; see local.mjs.
// Exit codes: 0 verified, 1 failed, 2 not configured.
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { Context } from '@deepseek-ai/cordis'
import System1Service from '../../lib/index.js'
import { ensureService } from './local.mjs'
import { targets } from './targets.mjs'

const name = process.argv[2]
const target = targets[name]
if (!target) {
  console.log(`Usage: pnpm probe <${Object.keys(targets).join('|')}>`)
  process.exit(2)
}
if (existsSync('.env.local')) process.loadEnvFile('.env.local')
const missing = target.requiredEnv.filter((key) => !process.env[key]?.trim())
if (missing.length) {
  console.log(JSON.stringify({
    status: 'not_configured',
    target: name,
    missing,
    note: 'Set these in .env.local. Credential values are never printed.',
  }, null, 2))
  process.exit(2)
}

const endpoint = target.endpoint?.()
const model = { provider: name, model: target.model() }
const { state, questions } = target.sample
const ctx = new Context()
let service
let provider
let stopLocal = async () => {}

try {
  if (target.kind === 'local') stopLocal = await ensureService(name, endpoint)
  service = await ctx.plugin(System1Service, { timeoutMs: target.timeoutMs })
  provider = await target.mount(ctx, endpoint)
  const health = await target.health?.(endpoint)
  const probe = { q: { type: 'noul', instructions: questions.refund.instructions } }

  const preCancelled = await ctx.system1.decide({
    state, questions: probe, model, signal: AbortSignal.abort(),
  })
  assertError(preCancelled, 'cancelled')
  const unsupported = await ctx.system1.decide({
    state, questions: probe, model: { provider: name, model: '__probe_unsupported__' },
  })
  assertError(unsupported, 'unsupported')

  const started = performance.now()
  const result = await ctx.system1.decide({ state, questions, model })
  const latencyMs = Math.round(performance.now() - started)
  assert.equal(result.meta.executed?.provider, name)
  assert.ok(result.meta.executed?.model, 'the service must report the executed model')

  const { refund, topic, urgency } = result.answers
  assert.equal(refund.status, 'ok', 'noul answer failed')
  assert.equal(refund.answer.type, 'noul')
  assertProbability(refund.answer.probabilityTrue, 'noul probability')
  assert.equal(topic.status, 'ok', 'choice answer failed')
  assert.equal(topic.answer.type, 'choice')
  assert.deepEqual(
    Object.keys(topic.answer.probabilities).sort(),
    Object.keys(questions.topic.criteria).sort(),
  )
  assert.ok(Object.hasOwn(questions.topic.criteria, topic.answer.value))
  assertDistribution(Object.values(topic.answer.probabilities), 'choice probabilities')
  assert.equal(urgency.status, 'ok', 'score answer failed')
  assert.equal(urgency.answer.type, 'score')
  assert.equal(urgency.answer.probabilities.length, questions.urgency.criteria.length)
  assertDistribution(urgency.answer.probabilities, 'score probabilities')

  let shortTimeout = 'skipped'
  if (!target.skipShortTimeout) {
    const timedOut = await ctx.system1.decide({ state, questions: probe, model, timeoutMs: 1 })
    assertError(timedOut, 'timeout')
    shortTimeout = 'timeout'
  }
  const details = target.verify?.({ result, health }) ?? {}

  console.log(JSON.stringify({
    status: 'verified',
    target: name,
    kind: target.kind,
    ...(endpoint ? { endpoint: new URL(endpoint).origin } : {}),
    requestedModel: model.model,
    executedModel: result.meta.executed.model,
    ...details,
    latencyMs,
    ...(result.meta.usage ? { usage: result.meta.usage } : {}),
    answers: {
      noul: refund.answer.probabilityTrue,
      choice: { value: topic.answer.value, probabilities: topic.answer.probabilities },
      score: { value: urgency.answer.value, probabilities: urgency.answer.probabilities },
    },
    checks: { preCancelled: 'cancelled', unsupportedModel: 'unsupported', shortTimeout },
  }, null, 2))
} catch (error) {
  const reason = error && typeof error === 'object' && 'code' in error && !(error instanceof assert.AssertionError)
    ? String(error.code)
    : error instanceof Error
      ? error.message
      : 'unexpected_error'
  console.log(JSON.stringify({ status: 'failed', target: name, reason }, null, 2))
  process.exitCode = 1
} finally {
  try {
    await provider?.dispose()
    await service?.dispose()
  } finally {
    await stopLocal()
  }
}

function assertError(result, code) {
  const answer = result.answers.q
  assert.equal(answer.status === 'error' && answer.error.code, code, `expected ${code}`)
}

function assertProbability(value, label) {
  assert.ok(Number.isFinite(value) && value >= 0 && value <= 1, `${label} must be in [0, 1]`)
}

function assertDistribution(values, label) {
  values.forEach((value) => assertProbability(value, label))
  const sum = values.reduce((total, value) => total + value, 0)
  assert.ok(Math.abs(sum - 1) <= 0.02, `${label} must sum to 1 (got ${sum})`)
}
