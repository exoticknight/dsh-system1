import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Context } from '@deepseek-ai/cordis'
import { System1Engine } from '../../src/core/engine.js'
import System1Service, {
  System1InputError,
  type System1Provider,
  type System1Options,
} from '../../src/index.js'

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
async function setup(
  t: { after(fn: () => Promise<void>): void },
  options: Partial<System1Options> = {},
) {
  const ctx = new Context()
  const fiber = await ctx.plugin(System1Service, {
    defaultModel: { provider: 'test', model: 'requested' },
    ...options,
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
  assert.equal('attempts' in result.meta, false)
  await assert.rejects(
    ctx.system1.decide({ state: null, questions: {} }),
    System1InputError,
  )
  assert.throws(
    () => ctx.system1.registerProvider('test', provider),
    System1InputError,
  )
})

test('unavailable preferred model falls back and records the failed attempt', async (t) => {
  const { ctx } = await setup(t, {
    fallbackModels: [{ provider: 'backup', model: 'model-b' }],
  })
  ctx.system1.registerProvider('backup', provider)

  const result = await ctx.system1.decide({ state: null, questions })

  assert.equal(result.answers.q.status, 'ok')
  assert.deepEqual(result.meta.requested, {
    provider: 'test',
    model: 'requested',
  })
  assert.equal(result.meta.executed?.provider, 'backup')
  assert.equal(result.meta.executed?.model, 'actual')
  assert.deepEqual(result.meta.attempts, [
    {
      provider: 'test',
      model: 'requested',
      error: {
        code: 'unavailable',
        message: 'Requested provider is not registered.',
      },
    },
  ])
})

test('fallback chain skips a missing provider after an ordinary provider error', async (t) => {
  const { ctx } = await setup(t, {
    fallbackModels: [
      { provider: 'missing', model: 'model-m' },
      { provider: 'backup', model: 'model-b' },
    ],
  })
  ctx.system1.registerProvider('test', {
    ...provider,
    async evaluate() {
      throw new Error('private backend detail')
    },
  })
  ctx.system1.registerProvider('backup', provider)

  const result = await ctx.system1.decide({ state: null, questions })

  assert.equal(result.answers.q.status, 'ok')
  assert.equal(result.meta.executed?.provider, 'backup')
  assert.deepEqual(result.meta.attempts, [
    {
      provider: 'test',
      model: 'requested',
      error: { code: 'provider_error', message: 'Provider evaluation failed.' },
    },
    {
      provider: 'missing',
      model: 'model-m',
      error: {
        code: 'unavailable',
        message: 'Requested provider is not registered.',
      },
    },
  ])
})

test('partial malformed answers do not discard valid siblings', async (t) => {
  const { ctx } = await setup(t, {
    fallbackModels: [{ provider: 'backup', model: 'backup-model' }],
  })
  let fallbackCalls = 0
  ctx.system1.registerProvider('backup', {
    ...provider,
    async evaluate() {
      fallbackCalls++
      return ok
    },
  })
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
  assert.equal(fallbackCalls, 0)
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
  const { ctx } = await setup(t, {
    fallbackModels: [{ provider: 'backup', model: 'backup-model' }],
  })
  let entered!: () => void
  const started = new Promise<void>((r) => {
    entered = r
  })
  let signal: AbortSignal | undefined
  let fallbackCalls = 0
  ctx.system1.registerProvider('backup', {
    ...provider,
    async evaluate() {
      fallbackCalls++
      return ok
    },
  })
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
  assert.equal(fallbackCalls, 0)
  assert.equal(
    (await ctx.system1.decide({ state: null, questions })).answers.q.status,
    'ok',
  )
})

test('service unload cancels calls and removes ctx service', async (t) => {
  const { ctx, fiber } = await setup(t, {
    fallbackModels: [{ provider: 'backup', model: 'backup-model' }],
  })
  let fallbackCalls = 0
  ctx.system1.registerProvider('backup', {
    ...provider,
    async evaluate() {
      fallbackCalls++
      return ok
    },
  })
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
  assert.equal(fallbackCalls, 0)
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

test('unsupported preferred model falls back to a capable model', async (t) => {
  const { ctx } = await setup(t, {
    fallbackModels: [{ provider: 'backup', model: 'capable' }],
  })
  ctx.system1.registerProvider('test', {
    async describe() {
      return { primitives: ['noul'] }
    },
    async evaluate() {
      throw new Error('unsupported model must not be evaluated')
    },
  })
  ctx.system1.registerProvider('backup', {
    async describe() {
      return { primitives: ['score'] }
    },
    async evaluate() {
      return {
        model: 'capable',
        answers: {
          q: {
            status: 'ok',
            answer: {
              type: 'score',
              value: 0.8,
              levels: ['low', 'high'],
              probabilities: [0.2, 0.8],
            },
          },
        },
      }
    },
  })

  const result = await ctx.system1.decide({
    state: null,
    questions: {
      q: { type: 'score', instructions: '?', criteria: ['low', 'high'] },
    },
  })

  assert.equal(result.answers.q.status, 'ok')
  assert.equal(result.meta.executed?.provider, 'backup')
  assert.deepEqual(result.meta.attempts?.map(({ error }) => error.code), [
    'unsupported',
  ])
})

test('model question limit falls back to a model with sufficient capacity', async (t) => {
  const { ctx } = await setup(t, {
    fallbackModels: [{ provider: 'backup', model: 'high-capacity' }],
  })
  ctx.system1.registerProvider('test', {
    async describe() {
      return { primitives: ['noul'], maxQuestions: 1 }
    },
    async evaluate() {
      throw new Error('limited model must not be evaluated')
    },
  })
  ctx.system1.registerProvider('backup', {
    async describe() {
      return { primitives: ['noul'] }
    },
    async evaluate() {
      return {
        model: 'high-capacity',
        answers: {
          a: { status: 'ok', answer: { type: 'noul', probabilityTrue: 0.8 } },
          b: { status: 'ok', answer: { type: 'noul', probabilityTrue: 0.7 } },
        },
      }
    },
  })

  const result = await ctx.system1.decide({
    state: null,
    questions: {
      a: { type: 'noul', instructions: 'First?' },
      b: { type: 'noul', instructions: 'Second?' },
    },
  })

  assert.equal(result.answers.a.status, 'ok')
  assert.equal(result.answers.b.status, 'ok')
  assert.deepEqual(result.meta.attempts?.map(({ error }) => error.code), [
    'limit_exceeded',
  ])
})

test('invalid response envelope falls back before returning per-question answers', async (t) => {
  const { ctx } = await setup(t, {
    fallbackModels: [{ provider: 'backup', model: 'backup-model' }],
  })
  ctx.system1.registerProvider('test', {
    ...provider,
    async evaluate() {
      return { model: 'requested', answers: null } as never
    },
  })
  ctx.system1.registerProvider('backup', provider)

  const result = await ctx.system1.decide({ state: null, questions })

  assert.equal(result.answers.q.status, 'ok')
  assert.equal(result.meta.executed?.provider, 'backup')
  assert.deepEqual(result.meta.attempts?.map(({ error }) => error.code), [
    'invalid_response',
  ])
})

test('caller timeout budget is available independently to each model attempt', async (t) => {
  const { ctx } = await setup(t, {
    fallbackModels: [{ provider: 'backup', model: 'backup-model' }],
  })
  const delayedProvider = (delayMs: number): System1Provider => ({
    ...provider,
    evaluate(_request, signal) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve(ok), delayMs)
        signal.addEventListener(
          'abort',
          () => {
            clearTimeout(timer)
            reject(signal.reason)
          },
          { once: true },
        )
      })
    },
  })
  ctx.system1.registerProvider('test', delayedProvider(100))
  ctx.system1.registerProvider('backup', delayedProvider(15))

  const result = await ctx.system1.decide({
    state: null,
    questions,
    timeoutMs: 40,
  })

  assert.equal(result.answers.q.status, 'ok')
  assert.equal(result.meta.executed?.provider, 'backup')
  assert.deepEqual(result.meta.attempts?.map(({ error }) => error.code), [
    'timeout',
  ])
})

test('all failed attempts return the last error and preserve their order', async (t) => {
  const { ctx } = await setup(t, {
    fallbackModels: [{ provider: 'backup', model: 'backup-model' }],
  })
  ctx.system1.registerProvider('test', {
    ...provider,
    async evaluate() {
      throw new Error('private failure')
    },
  })
  ctx.system1.registerProvider('backup', {
    ...provider,
    async evaluate() {
      return { model: 'backup-model', answers: null } as never
    },
  })

  const result = await ctx.system1.decide({ state: null, questions })

  assert.deepEqual(result.answers.q, {
    status: 'error',
    error: {
      code: 'invalid_response',
      message: 'Provider returned an invalid response envelope.',
    },
  })
  assert.equal(result.meta.executed, undefined)
  assert.deepEqual(result.meta.attempts?.map(({ provider, error }) => ({
    provider,
    code: error.code,
  })), [
    { provider: 'test', code: 'provider_error' },
    { provider: 'backup', code: 'invalid_response' },
  ])
})

test('model chain deduplicates identical provider and model pairs', async (t) => {
  const { ctx } = await setup(t, {
    fallbackModels: [
      { provider: 'test', model: 'requested' },
      { provider: 'test', model: 'requested' },
      { provider: 'test', model: 'second' },
    ],
  })
  const calls: string[] = []
  ctx.system1.registerProvider('test', {
    ...provider,
    async evaluate(request) {
      calls.push(request.model)
      if (request.model === 'requested') throw new Error('try next model')
      return { ...ok, model: 'second-actual' }
    },
  })

  const result = await ctx.system1.decide({ state: null, questions })

  assert.equal(result.answers.q.status, 'ok')
  assert.deepEqual(calls, ['requested', 'second'])
  assert.equal(result.meta.executed?.model, 'second-actual')
  assert.equal(result.meta.attempts?.length, 1)
})

test('invalid configured fallback models raise System1InputError', async (t) => {
  const ctx = new Context()
  const fiber = await ctx.plugin(System1Service, {
    fallbackModels: [{ provider: ' ', model: '' }],
  })
  t.after(async () => {
    await fiber.dispose()
  })

  await assert.rejects(
    ctx.system1.decide({ state: null, questions }),
    System1InputError,
  )
})

test('changing configuration during a call does not rewrite its model chain', async (t) => {
  let options: System1Options = {
    defaultModel: { provider: 'test', model: 'requested' },
    fallbackModels: [{ provider: 'backup', model: 'backup-model' }],
  }
  const engine = new System1Engine(() => options)
  t.after(async () => engine.dispose())
  let entered!: () => void
  const started = new Promise<void>((resolve) => {
    entered = resolve
  })
  let fail!: () => void
  const failing = new Promise<never>((_resolve, reject) => {
    fail = () => reject(new Error('try the configured fallback'))
  })
  engine.registerProvider('test', {
    ...provider,
    async evaluate() {
      entered()
      await failing
      return ok
    },
  })
  engine.registerProvider('backup', provider)
  engine.registerProvider('replacement', provider)

  const pending = engine.decide({ state: null, questions })
  await started
  options = {
    ...options,
    fallbackModels: [{ provider: 'replacement', model: 'new-model' }],
  }
  fail()
  const result = await pending

  assert.equal(result.answers.q.status, 'ok')
  assert.equal(result.meta.executed?.provider, 'backup')
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
  const { ctx } = await setup(t, {
    fallbackModels: [{ provider: 'backup', model: 'backup-model' }],
  })
  let enter!: () => void
  const started = new Promise<void>((resolve) => {
    enter = resolve
  })
  let aborted = false
  let fallbackCalls = 0
  ctx.system1.registerProvider('backup', {
    ...provider,
    async evaluate() {
      fallbackCalls++
      return ok
    },
  })
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
  assert.equal(fallbackCalls, 0)
})

test('service without a default model accepts an explicit per-call model', async (t) => {
  const ctx = new Context()
  const fiber = await ctx.plugin(System1Service, {
    fallbackModels: [{ provider: 'backup', model: 'backup-model' }],
  })
  t.after(async () => {
    await fiber.dispose()
  })
  let fallbackCalls = 0
  ctx.system1.registerProvider('backup', {
    ...provider,
    async evaluate() {
      fallbackCalls++
      return ok
    },
  })
  ctx.system1.registerProvider('test', provider)
  const result = await ctx.system1.decide({
    state: 'sample',
    questions,
    model: { provider: 'test', model: 'requested' },
  })
  assert.equal(result.answers.q.status, 'ok')
  assert.deepEqual(result.meta.requested, {
    provider: 'test',
    model: 'requested',
  })
  assert.equal('attempts' in result.meta, false)
  assert.equal(fallbackCalls, 0)
  const fallbackOnly = await ctx.system1.decide({ state: 'sample', questions })
  assert.equal(fallbackOnly.answers.q.status, 'ok')
  assert.deepEqual(fallbackOnly.meta.requested, {
    provider: 'backup',
    model: 'backup-model',
  })
  assert.equal(fallbackCalls, 1)
})

test('service with no default or fallback model rejects an unconfigured call', async (t) => {
  const ctx = new Context()
  const fiber = await ctx.plugin(System1Service, {})
  t.after(async () => {
    await fiber.dispose()
  })

  await assert.rejects(
    ctx.system1.decide({ state: null, questions }),
    System1InputError,
  )
})
