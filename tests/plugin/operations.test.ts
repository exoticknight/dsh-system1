import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Context } from '@deepseek-ai/cordis'
import System1Service, { defineOperation, System1InputError, System1ProviderError } from '../../src/index.js'
import type { OperationImplementation } from '../../src/contracts/operation.js'

type Input = { kind: 'text' | 'image'; source: string }
type Output = readonly string[]
type Capability = { limit: number; secret?: string }
const operation = defineOperation<Input, Output, Capability>({
  id: 'test.extract',
  version: 1,
  title: 'Extract',
  inputKinds: [{ id: 'text', title: 'Text' }, { id: 'image', title: 'Image' }],
  getInputKind: ({ kind }) => kind,
  parseInput(input) {
    const value = input as Input
    if (typeof value?.source !== 'string') throw Error('bad input')
    return value
  },
  parseOutput(value) {
    if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) throw Error('bad output')
    return value as string[]
  },
  checkCapabilities: ({ source }, { limit }) => source.length > limit
    ? { code: 'limit_exceeded', message: 'Limit exceeded.' }
    : undefined,
  tool: { name: 'test_extract', description: 'Extract matching text', parameters: { type: 'object' } },
})
const model = (provider: string, name = 'one') => ({ provider, model: name })
const text: Input = { kind: 'text', source: 'abc' }
const image: Input = { kind: 'image', source: 'img' }

function implementation(
  execute: OperationImplementation<Input, Output, Capability>['execute'],
  inputs: readonly string[] = ['text', 'image'],
): OperationImplementation<Input, Output, Capability> {
  return {
    version: 1,
    timeoutMs: () => 1000,
    models: { kind: 'fixed', models: [{
      id: 'one', aliases: ['alias'], inputs, capabilities: { limit: 10, secret: 'not-in-catalog' },
    }] },
    execute,
  }
}

test('route is operation-scoped, skips unsupported/duplicate candidates, and stops on an empty valid result', async (t) => {
  const ctx = new Context()
  const fiber = await ctx.plugin(System1Service, {
    defaultModel: model('decisions'),
    operations: {
      [operation.id]: {
        defaultModel: model('text'),
        fallbackModels: [model('image', 'alias'), model('image'), model('backup')],
        agentEnabled: true,
      },
    },
  })
  t.after(() => fiber.dispose())
  const svc = ctx.system1
  const notification: string[][] = []
  const unsubscribe = svc.subscribeCatalog(() => notification.push(svc.getCatalog().operations.map(({ id }) => id)))
  t.after(unsubscribe)
  const removeOperation = svc.registerOperation(operation)
  const sent: string[] = []
  let failImage = false
  const make = (provider: string, values: Output) => implementation(async (_input, { model }) => {
    sent.push(provider)
    if (provider === 'image' && failImage)
      throw new System1ProviderError({ code: 'unavailable', message: 'Temporary failure.' }, 'fallback')
    return { model, result: values }
  }, provider === 'text' ? ['text'] : ['image'])
  svc.registerImplementation(operation, 'text', make('text', ['x']))
  svc.registerImplementation(operation, 'image', make('image', []))
  svc.registerImplementation(operation, 'backup', make('backup', ['unexpected']))
  assert.throws(() => svc.registerImplementation(operation, 'text', make('text', [])), System1InputError)
  assert.throws(() => svc.registerImplementation(operation, 'other', { ...make('text', []), version: 2 }), System1InputError)
  assert.equal(svc.getAgentTools().length, 1)
  const catalogEntry = () => svc.getCatalog().operations.find(({ id }) => id === operation.id)
  assert.equal(catalogEntry()?.route.agentEnabled, true)
  assert.equal(catalogEntry()?.agentAvailable, false)
  svc.setOperationToolMounted('test_extract', true)
  assert.equal(catalogEntry()?.agentAvailable, true)
  const result = await svc.run(operation, image)
  assert.deepEqual(sent, ['image'])
  assert.equal(result.status, 'ok')
  if (result.status === 'ok') {
    assert.deepEqual(result.value, [])
    assert.deepEqual(result.meta.executed, model('image'))
    assert.deepEqual(result.meta.attempts.map(({ provider, kind }) => [provider, kind]), [['text', 'skipped'], ['image', 'executed']])
  }
  const forced = await svc.run(operation, image, { model: model('text') })
  assert.equal(forced.status === 'error' && forced.reason, 'no_applicable_model')
  assert.deepEqual(sent, ['image'])
  failImage = true
  const recovered = await svc.run(operation, image)
  assert.deepEqual(recovered.meta.executed, model('backup'))
  assert.deepEqual(sent, ['image', 'image', 'backup'])
  assert.equal(JSON.stringify(svc.getCatalog()).includes('not-in-catalog'), false)
  const tool = svc.getAgentTools()[0]!
  removeOperation()
  assert.deepEqual(notification.at(-1), ['decide', 'locate'])
  assert.deepEqual(svc.getAgentTools(), [])
  await assert.rejects(tool.execute(text, new AbortController().signal), System1InputError)
  const replacement = defineOperation({ ...operation, version: 2 })
  svc.registerOperation(replacement)
  svc.registerImplementation(replacement, 'text', { ...make('text', []), version: 2 })
  assert.equal(catalogEntry()?.route.compatible, false)
  const incompatible = await svc.run(replacement, text)
  assert.equal(incompatible.status === 'error' && incompatible.reason, 'no_applicable_model')
  assert.equal((await svc.run(replacement, text, { model: model('text') })).status, 'ok')
})

test('deployment resolves inside the attempt; invalid output can fall back but a stop error cannot forward input', async (t) => {
  const ctx = new Context()
  const fiber = await ctx.plugin(System1Service, {
    operations: {
      [operation.id]: { defaultModel: model('deployment', 'custom-name'), fallbackModels: [model('backup')] },
    },
  })
  t.after(() => fiber.dispose())
  const svc = ctx.system1
  svc.registerOperation(operation)
  const sent: string[] = []
  let mode: 'invalid-output' | 'policy-refusal' | 'no-credential' = 'invalid-output'
  svc.registerImplementation(operation, 'deployment', {
    version: 1,
    models: {
      kind: 'deployment',
      inputs: ['text'],
      async resolve(id, signal) {
        assert.equal(id, 'custom-name')
        assert.ok(signal instanceof AbortSignal)
        sent.push('resolve')
        return { id, inputs: ['text'], capabilities: { limit: 10 } }
      },
    },
    timeoutMs: () => 800,
    async execute(input, { model }) {
      sent.push(model)
      input.source = 'mutated by first provider'
      if (mode === 'policy-refusal')
        throw new System1ProviderError({ code: 'unavailable', message: 'Retention policy refused this request.' })
      if (mode === 'no-credential')
        throw new System1ProviderError({ code: 'unavailable', message: 'Configure a credential.' }, 'fallback', false)
      return { model, result: ['invalid', 1] as unknown as Output }
    },
  })
  svc.registerImplementation(operation, 'backup', implementation(async (input, { model }) => {
    sent.push('backup')
    return { model, result: [input.source] }
  }))
  const result = await svc.run(operation, text)
  assert.equal(result.status, 'ok')
  if (result.status === 'ok') assert.deepEqual(result.value, ['abc'])
  assert.deepEqual(sent, ['resolve', 'custom-name', 'backup'])
  mode = 'policy-refusal'
  const stopped = await svc.run(operation, text)
  assert.equal(stopped.status === 'error' && stopped.reason, 'upstream_execution_failed')
  assert.equal(sent.filter((step) => step === 'backup').length, 1)
  mode = 'no-credential'
  const skipped = await svc.run(operation, text)
  assert.equal(skipped.meta.attempts[0]?.kind, 'skipped')
  assert.equal(skipped.status, 'ok')
})

test('an invalid refreshed deployment leaves other providers and its fallback usable', async (t) => {
  const ctx = new Context()
  const fiber = await ctx.plugin(System1Service, {
    operations: { [operation.id]: { defaultModel: model('dynamic'), fallbackModels: [model('backup')] } },
  })
  t.after(() => fiber.dispose())
  const svc = ctx.system1
  svc.registerOperation(operation)
  const base = implementation(async () => { throw Error('unbound transport') })
  let available = true
  svc.registerImplementation(operation, 'dynamic', {
    ...base,
    resolveDeployment() {
      if (!available) throw Error('private resolution error')
      return { models: base.models, execute: async () => ({ model: 'current', result: ['bound'] }) }
    },
  })
  svc.registerImplementation(operation, 'backup', implementation(async (_input, { model }) => ({ model, result: [] })))
  assert.deepEqual((await svc.run(operation, text)).meta.executed, model('dynamic', 'current'))
  available = false
  assert.deepEqual(svc.getCatalog().operations.find(({ id }) => id === operation.id)?.providers.map(({ id }) => id), ['backup'])
  const recovered = await svc.run(operation, text)
  assert.deepEqual(recovered.meta.executed, model('backup'))
  assert.deepEqual(recovered.meta.attempts[0], {
    ...model('dynamic'), kind: 'skipped',
    error: { code: 'invalid_response', message: 'Implementation returned an invalid deployment.' },
  })
})

test('unregistering an actively executing implementation cancels the whole chain within its budget', async (t) => {
  const ctx = new Context()
  const fiber = await ctx.plugin(System1Service, {
    operations: { [operation.id]: { defaultModel: model('blocked'), fallbackModels: [model('backup')] } },
  })
  t.after(() => fiber.dispose())
  const svc = ctx.system1
  svc.registerOperation(operation)
  let ready!: (signal: AbortSignal) => void
  const sent = new Promise<AbortSignal>((resolve) => { ready = resolve })
  const remove = svc.registerImplementation(operation, 'blocked', implementation(async (_input, { signal }) => {
    ready(signal)
    return new Promise(() => {})
  }))
  let backupCalls = 0
  svc.registerImplementation(operation, 'backup', implementation(async (_input, { model }) => {
    backupCalls++
    return { model, result: [] }
  }))
  const pending = svc.run(operation, text)
  const signal = await sent
  remove()
  assert.equal(signal.aborted, true)
  const result = await pending
  assert.equal(result.status === 'error' && result.reason, 'cancelled')
  assert.equal(backupCalls, 0)
  assert.equal((await svc.run(operation, text)).status, 'ok')
  assert.equal(backupCalls, 1)
})
