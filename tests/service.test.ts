import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Context } from '@deepseek-ai/cordis'
import System1Service, {
  System1InputError,
  type System1Provider,
} from '../src/index.js'

const questions = { q: { type: 'noul', instructions: 'yes?' } } as const
const ok = {
  model: 'actual',
  answers: {
    q: { status: 'ok', answer: { type: 'noul', probabilityTrue: 0.8 } },
  },
}
const provider: System1Provider = {
  async describe() {
    return { primitives: ['noul'] }
  },
  async evaluate() {
    return ok
  },
}
async function setup(t: { after(fn: () => Promise<void>): void }) {
  const ctx = new Context()
  const fiber = await ctx.plugin(System1Service, {
    defaultModel: { provider: 'test', model: 'requested' },
  })
  t.after(async () => {
    await fiber.dispose()
  })
  assert.ok(ctx.system1)
  return { ctx, fiber }
}

test('public service returns provider metadata and validates caller input', async (t) => {
  const { ctx } = await setup(t)
  ctx.system1.registerProvider('test', provider)
  const result = await ctx.system1.decide({ state: { text: 'hi' }, questions })
  assert.equal(result.answers.q.status, 'ok')
  assert.equal(result.meta.executed?.model, 'actual')
  assert.equal(result.meta.requested.model, 'requested')
  await assert.rejects(
    ctx.system1.decide({ state: null, questions: {} }),
    System1InputError,
  )
  assert.throws(
    () => ctx.system1.registerProvider('test', provider),
    System1InputError,
  )
})

test('partial malformed answers do not discard valid siblings', async (t) => {
  const { ctx } = await setup(t)
  ctx.system1.registerProvider('test', {
    ...provider,
    async evaluate() {
      return {
        ...ok,
        answers: {
          ...ok.answers,
          bad: { status: 'ok', answer: { type: 'noul', probabilityTrue: 2 } },
          extra: {},
        },
      }
    },
  })
  const result = await ctx.system1.decide({
    state: null,
    questions: { ...questions, bad: questions.q, missing: questions.q },
  })
  assert.equal(result.answers.q.status, 'ok')
  assert.equal(result.answers.bad.status, 'error')
  assert.equal(result.answers.missing.status, 'error')
  assert.deepEqual(result.meta.warnings, ['unexpected_answer_ids'])
})

test('total budget bounds non-cooperating capability discovery', async (t) => {
  const { ctx } = await setup(t)
  let signal: AbortSignal | undefined
  ctx.system1.registerProvider('test', {
    ...provider,
    describe(_model, s) {
      signal = s
      return new Promise(() => {})
    },
  })
  const result = await ctx.system1.decide({
    state: null,
    questions,
    timeoutMs: 15,
  })
  assert.equal(
    result.answers.q.status === 'error' && result.answers.q.error.code,
    'timeout',
  )
  assert.equal(signal?.aborted, true)
})

test('unregister cancels in-flight work; stale disposer cannot remove new registration', async (t) => {
  const { ctx } = await setup(t)
  let entered!: () => void
  const started = new Promise<void>((r) => {
    entered = r
  })
  let signal: AbortSignal | undefined
  const remove = ctx.system1.registerProvider('test', {
    ...provider,
    async evaluate(_req, s) {
      signal = s
      entered()
      return new Promise(() => {})
    },
  })
  const pending = ctx.system1.decide({ state: null, questions })
  await started
  remove()
  ctx.system1.registerProvider('test', provider)
  remove()
  assert.equal(signal?.aborted, true)
  const result = await pending
  assert.equal(
    result.answers.q.status === 'error' && result.answers.q.error.code,
    'cancelled',
  )
  assert.equal(
    (await ctx.system1.decide({ state: null, questions })).answers.q.status,
    'ok',
  )
})

test('service unload cancels calls and removes ctx service', async (t) => {
  const { ctx, fiber } = await setup(t)
  ctx.system1.registerProvider('test', {
    ...provider,
    async evaluate() {
      return new Promise(() => {})
    },
  })
  const service = ctx.system1
  const pending = service.decide({ state: null, questions })
  await fiber.dispose()
  const result = await pending
  assert.equal(
    result.answers.q.status === 'error' && result.answers.q.error.code,
    'cancelled',
  )
  assert.equal(ctx.get('system1'), undefined)
})

test('pre-cancel avoids backend; unsupported model capability avoids evaluation', async (t) => {
  const { ctx } = await setup(t)
  let calls = 0
  ctx.system1.registerProvider('test', {
    ...provider,
    async evaluate() {
      calls++
      return ok
    },
  })
  const cancelled = await ctx.system1.decide({
    state: null,
    questions,
    signal: AbortSignal.abort(),
  })
  assert.equal(
    cancelled.answers.q.status === 'error' && cancelled.answers.q.error.code,
    'cancelled',
  )
  const unsupported = await ctx.system1.decide({
    state: null,
    questions: {
      q: { type: 'score', instructions: '?', criteria: ['a', 'b'] },
    },
  })
  assert.equal(
    unsupported.answers.q.status === 'error' &&
      unsupported.answers.q.error.code,
    'unsupported',
  )
  assert.equal(calls, 0)
})

test('provider mutation cannot rewrite the validation snapshot', async (t) => {
  const { ctx } = await setup(t)
  ctx.system1.registerProvider('test', {
    ...provider,
    async evaluate(request) {
      const mutable = request.questions as Record<string, unknown>
      mutable.q = { type: 'choice', instructions: '?', criteria: { a: 'A' } }
      return {
        model: 'actual',
        answers: {
          q: {
            status: 'ok',
            answer: { type: 'choice', value: 'a', probabilities: { a: 1 } },
          },
        },
      }
    },
  })
  const result = await ctx.system1.decide({ state: 'sample', questions })
  assert.equal(
    result.answers.q.status === 'error' && result.answers.q.error.code,
    'invalid_response',
  )
  assert.equal(questions.q.type, 'noul')
})

test('caller cancellation aborts provider I/O after evaluation starts', async (t) => {
  const { ctx } = await setup(t)
  let enter!: () => void
  const started = new Promise<void>((resolve) => {
    enter = resolve
  })
  let aborted = false
  ctx.system1.registerProvider('test', {
    ...provider,
    evaluate(_req, signal) {
      return new Promise((_resolve, reject) => {
        signal.addEventListener(
          'abort',
          () => {
            aborted = true
            reject(signal.reason)
          },
          { once: true },
        )
        enter()
      })
    },
  })
  const controller = new AbortController()
  const pending = ctx.system1.decide({
    state: 'sample',
    questions,
    signal: controller.signal,
  })
  await started
  controller.abort()
  const result = await pending
  assert.equal(
    result.answers.q.status === 'error' && result.answers.q.error.code,
    'cancelled',
  )
  assert.equal(aborted, true)
})

test('service without a default model accepts an explicit per-call model', async (t) => {
  const ctx = new Context()
  const fiber = await ctx.plugin(System1Service, {})
  t.after(async () => {
    await fiber.dispose()
  })
  ctx.system1.registerProvider('test', provider)
  const result = await ctx.system1.decide({
    state: 'sample',
    questions,
    model: { provider: 'test', model: 'requested' },
  })
  assert.equal(result.answers.q.status, 'ok')
  await assert.rejects(
    ctx.system1.decide({ state: 'sample', questions }),
    System1InputError,
  )
})
