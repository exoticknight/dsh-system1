import { decideOperation, defineOperation, locateOperation, System1OperationDisabledError } from '../../src/index.js'
import type { DecisionTransport } from '../../src/providers/decision-implementation.js'
import { decisionFixture } from '../shared/decision-fixture.js'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { Context, Service } from '@deepseek-ai/cordis'
import System1Service, {
  type ModelCapabilities,
  type System1Options,
} from '../../src/index.js'
import {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENT_COUNT_PER_TYPE,
  MAX_TOTAL_ATTACHMENT_BYTES,
} from '../../src/core/validation.js'
import * as tool from '../../src/tool/index.js'

interface Registered {
  name: string
  description: string
  parameters: Record<string, unknown>
  output: {
    schema: Record<string, unknown>
    render(args: unknown, value: unknown): { type: string; text: string }[]
  }
  execute(args: unknown, exec: { signal: AbortSignal }): Promise<unknown>
}

class FakeTools extends Service {
  readonly registered = new Map<string, Registered>()
  constructor(ctx: Context) {
    super(ctx, 'tools')
  }
  register(definition: Registered) {
    if (definition.name === 'run_code' || this.registered.has(definition.name))
      throw new Error('Tool name is reserved or already registered')
    this.registered.set(definition.name, definition)
    return () => {
      this.registered.delete(definition.name)
    }
  }
}

const provider: DecisionTransport = {
  timeoutMs: () => 800,
  async describe() {
    return capabilitiesFor(['noul', 'choice', 'score'])
  },
  async evaluate(request) {
    assert.equal(request.state, 'I want my money back')
    return {
      model: 'actual',
      answers: {
        refund: { status: 'ok', answer: { type: 'noul', probabilityTrue: 0.9 } },
        topic: {
          status: 'ok',
          answer: {
            type: 'choice',
            value: 'billing',
            probabilities: { billing: 0.8, technical: 0.2 },
          },
        },
        urgency: {
          status: 'error',
          error: { code: 'unsupported', message: 'no score' },
        },
      },
    }
  },
}

function capabilitiesFor(
  primitives: ModelCapabilities['primitives'],
  overrides: Partial<ModelCapabilities> = {},
): ModelCapabilities {
  return {
    primitives,
    maxQuestions: null,
    maxChoiceOptions: null,
    maxScoreLevels: null,
    ...overrides,
  }
}

async function setup(
  t: { after(fn: () => Promise<void>): void },
  options: Partial<System1Options> = {},
  preferred: DecisionTransport = provider,
) {
  const ctx = new Context()
  const fibers = [
    await ctx.plugin(System1Service, {
      defaultModel: { provider: 'test', model: 'requested' },
      ...options,
    }),
    await ctx.plugin(FakeTools),
  ]
  ctx.system1.registerImplementation(decideOperation, 'test', decisionFixture(preferred))
  fibers.push(await ctx.plugin(tool))
  t.after(async () => {
    for (const fiber of fibers.reverse()) await fiber.dispose()
  })
  const tools = ctx.get('tools') as unknown as FakeTools
  return { ctx, tools, service: fibers[0]!, fiber: fibers[2]! }
}

const args = {
  state: 'I want my money back',
  questions: [
    { id: 'refund', type: 'noul', instructions: 'Is the user asking for a refund?' },
    {
      id: 'topic',
      type: 'choice',
      instructions: 'Choose a topic.',
      criteria: { billing: 'Billing', technical: 'Technical support' },
    },
    {
      id: 'urgency',
      type: 'score',
      instructions: 'Rate urgency.',
      criteria: ['Normal', 'Urgent'],
    },
  ],
}

test('committed per-operation switches gate API calls and only withdraw the affected Agent tool', async (t) => {
  const locateModel = { provider: 'local', model: 'fixture' }
  const decisionModel = { provider: 'test', model: 'requested' }
  const fallback = { provider: 'backup', model: 'saved' }
  const locateRoute = { defaultModel: locateModel, fallbackModels: [fallback], agentEnabled: true }
  let decisionCalls = 0
  const { ctx, tools, service } = await setup(t, {
    defaultModel: decisionModel, fallbackModels: [fallback], operations: { locate: locateRoute },
  }, {
    ...provider,
    evaluate(request, signal) {
      decisionCalls++
      return provider.evaluate(request, signal)
    },
  })
  let locateCalls = 0
  ctx.system1.registerImplementation(locateOperation, 'local', {
    version: 1,
    models: { kind: 'fixed', models: [{ id: locateModel.model, inputs: ['text'], capabilities: {} }] },
    timeoutMs: () => 800,
    async execute(_input, { model }) { locateCalls++; return { model, result: { matches: [] } } },
  })
  const locateInput = { source: { type: 'text', text: 'abc' }, instructions: 'Locate a.' } as const
  const decisionInput = { state: args.state, questions: { refund: { type: 'noul', instructions: 'Refund?' } } } as const
  const locateTool = tools.registered.get('system1_locate')!
  const decisionTool = tools.registered.get('system1_decide')!
  assert.ok(locateTool && decisionTool)
  const catalog = (id: string) => ctx.system1.getCatalog().operations.find((entry) => entry.id === id)!
  const write = Symbol.for('cosmokit.volatile.write')
  const update = (operations: System1Options['operations']) => {
    // Advance the same validated reference and emit the same notification as the Cordis loader.
    const config = service.config as { operations: { [key: symbol]: (value: unknown) => void } }
    config.operations[write]!(operations)
    service.ctx.emit('loader/volatile-update', [['operations']])
  }
  assert.equal(catalog('decide').route.enabled, true)
  assert.equal(catalog('locate').route.enabled, true, 'a legacy configured route stays on')
  update({ decide: { enabled: false }, locate: locateRoute })
  assert.equal(tools.registered.has('system1_decide'), false)
  assert.equal(tools.registered.get('system1_locate'), locateTool)
  assert.deepEqual(catalog('decide').route, {
    enabled: false, defaultModel: decisionModel, fallbackModels: [fallback], agentEnabled: true, version: 1, compatible: true,
  })
  assert.equal(catalog('decide').agentAvailable, false)
  await assert.rejects(ctx.system1.decide({ ...decisionInput, model: decisionModel }), System1OperationDisabledError)
  await assert.rejects(ctx.system1.run(decideOperation, decisionInput), System1OperationDisabledError)
  await assert.rejects(decisionTool.execute(args, { signal: new AbortController().signal }), System1OperationDisabledError)
  assert.equal(decisionCalls, 0)
  await locateTool.execute(locateInput, { signal: new AbortController().signal })
  assert.equal(locateCalls, 1)

  update({ decide: { enabled: true }, locate: { ...locateRoute, enabled: false } })
  assert.ok(tools.registered.has('system1_decide'))
  assert.equal(tools.registered.has('system1_locate'), false)
  assert.equal(catalog('locate').route.agentEnabled, true)
  assert.equal(catalog('locate').agentAvailable, false)
  await assert.rejects(ctx.system1.locate(locateInput, { model: locateModel }), System1OperationDisabledError)
  await assert.rejects(ctx.system1.run(locateOperation, locateInput), System1OperationDisabledError)
  await assert.rejects(locateTool.execute(locateInput, { signal: new AbortController().signal }), System1OperationDisabledError)
  assert.equal(locateCalls, 1)
  assert.equal((await ctx.system1.decide(decisionInput)).answers.refund.status, 'ok')
  assert.equal(decisionCalls, 1)

  update({ decide: { enabled: true }, locate: { ...locateRoute, enabled: true } })
  assert.equal(catalog('locate').agentAvailable, true)
  assert.deepEqual(catalog('locate').route.fallbackModels, locateRoute.fallbackModels)
  assert.equal((await ctx.system1.locate(locateInput)).meta.executed?.model, locateModel.model)
  assert.equal(locateCalls, 2)
})

test('agent tool is registered by default and unregistered on dispose', async (t) => {
  const { tools, fiber } = await setup(t)
  const definition = tools.registered.get(tool.TOOL_NAME)
  assert.ok(definition)
  assert.equal(definition.parameters.type, 'object')
  assert.match(definition.description, /probabilities.*0.?1/i)
  assert.match(definition.description, /zero-based.*criteria/i)
  assert.match(definition.description, /confidence.*backend/i)
  assert.match(definition.description, /not.*calibrated/i)
  assert.match(definition.description, /every provider fails.*model is omitted/i)
  assert.match(definition.description, /audio, and video attachments/i)
  const inputProperties = definition.parameters.properties as Record<
    string,
    {
      type?: string
      maxItems?: number
      description?: string
      items?: { properties?: Record<string, unknown> }
    }
  >
  const expectedLimits = `${MAX_ATTACHMENT_COUNT_PER_TYPE} items, ${MAX_ATTACHMENT_BYTES / (1024 * 1024)} MiB per item, ${MAX_TOTAL_ATTACHMENT_BYTES / (1024 * 1024)} MiB total decoded across all attachment types`
  assert.equal(inputProperties.images?.maxItems, MAX_ATTACHMENT_COUNT_PER_TYPE)
  assert.match(inputProperties.images?.description ?? '', new RegExp(expectedLimits))
  assert.match(inputProperties.images?.description ?? '', /TypeSafe supports PNG and JPEG; Cloudflare, Drex Max, meraGPT, and Liquid AI also support WebP/u)
  assert.equal(inputProperties.audio?.type, 'array')
  assert.equal(inputProperties.audio?.maxItems, MAX_ATTACHMENT_COUNT_PER_TYPE)
  assert.match(inputProperties.audio?.description ?? '', new RegExp(expectedLimits))
  assert.equal(inputProperties.videos?.type, 'array')
  assert.equal(inputProperties.videos?.maxItems, MAX_ATTACHMENT_COUNT_PER_TYPE)
  assert.match(inputProperties.videos?.description ?? '', new RegExp(expectedLimits))
  assert.deepEqual(
    (inputProperties.audio?.items?.properties?.mediaType as { enum: string[] }).enum,
    ['audio/wav', 'audio/mpeg'],
  )
  assert.deepEqual(
    (inputProperties.videos?.items?.properties?.mediaType as { enum: string[] }).enum,
    ['video/mp4', 'video/webm'],
  )
  const outputProperties = definition.output.schema.properties as Record<
    string,
    { type?: string; items?: { properties?: Record<string, unknown> } }
  >
  assert.deepEqual(definition.output.schema.required, ['answers'])
  assert.equal(outputProperties.fallbacks?.type, 'array')
  assert.ok(outputProperties.fallbacks?.items?.properties?.error)
  await fiber.dispose()
  assert.equal(tools.registered.has(tool.TOOL_NAME), false)
})

test('a rejected extension tool does not block healthy tools during startup or refresh', async (t) => {
  const ctx = new Context()
  const model = { provider: 'test', model: 'requested' }
  const route = { defaultModel: model, agentEnabled: true }
  const fibers = [
    await ctx.plugin(System1Service, {
      defaultModel: model,
      operations: { 'test.start': route, 'test.next': route, 'test.hot': route, 'test.tail': route },
    }),
    await ctx.plugin(FakeTools),
  ]
  t.after(async () => {
    for (const fiber of fibers.reverse()) await fiber.dispose()
  })
  const service = ctx.system1
  service.registerImplementation(decideOperation, 'test', decisionFixture(provider))
  const tools = ctx.get('tools') as unknown as FakeTools
  const ownTool: Registered = {
    name: 'host_owned',
    description: 'Host tool',
    parameters: {},
    output: { schema: {}, render: () => [] },
    execute: async () => null,
  }
  tools.register(ownTool)
  const registerEcho = (id: string, name: string) => {
    const operation = defineOperation({
      id, version: 1, title: 'Echo', inputKinds: [{ id: 'text', title: 'Text' }],
      parseInput: (value) => String(value),
      parseOutput: (value) => String(value),
      checkCapabilities: () => undefined,
      tool: { name, description: 'Echo text', parameters: { type: 'string' }, toOutput: (result) =>
        result.status === 'ok' ? result.value : result.error.message },
    })
    const remove = service.registerOperation(operation)
    service.registerImplementation(operation, 'test', {
      version: 1, timeoutMs: () => 800,
      models: { kind: 'fixed', models: [{ id: model.model, inputs: ['text'], capabilities: null }] },
      async execute(input, { model }) { return { model, result: input } },
    })
    return remove
  }
  const available = (id: string) => service.getCatalog().operations.find((entry) => entry.id === id)?.agentAvailable
  const execution = { signal: new AbortController().signal }
  const removeStart = registerEcho('test.start', 'run_code')
  registerEcho('test.next', 'test_next')
  fibers.push(await ctx.plugin(tool))
  assert.equal(available('test.start'), false)
  assert.equal(available('test.next'), true)
  assert.ok(await tools.registered.get('system1_decide')!.execute(args, execution))
  assert.equal(await tools.registered.get('test_next')!.execute('next', execution), 'next')
  removeStart()
  registerEcho('test.start', 'test_start')
  assert.equal(available('test.start'), true)

  const removeHot = registerEcho('test.hot', 'host_owned')
  registerEcho('test.tail', 'test_tail')
  assert.equal(available('test.hot'), false)
  assert.equal(tools.registered.get('host_owned'), ownTool)
  assert.equal(await tools.registered.get('test_tail')!.execute('tail', execution), 'tail')
  removeHot()
  registerEcho('test.hot', 'test_hot')
  assert.equal(available('test.hot'), true)
  assert.equal(await tools.registered.get('test_hot')!.execute('hot', execution), 'hot')
})

test('agent tool forwards audio and video attachments to decide', async (t) => {
  const audio = [{ mediaType: 'audio/mpeg', data: 'bXAz' }] as const
  const videos = [{ mediaType: 'video/mp4', data: 'bXA0' }] as const
  const { tools } = await setup(t, {}, {
    ...provider,
    async describe() {
      return capabilitiesFor(['noul', 'choice', 'score'], {
        audio: { formats: ['audio/mpeg'], maxCount: 4, maxBytesPerItem: 8 },
        videos: { formats: ['video/mp4'], maxCount: 2, maxBytesPerItem: 8 },
        audioVideo: { maxTotalBytes: 16 },
      })
    },
    async evaluate(request) {
      assert.deepEqual(request.audio, audio)
      assert.deepEqual(request.videos, videos)
      return {
        model: 'actual',
        answers: {
          q: { status: 'ok', answer: { type: 'noul', probabilityTrue: 0.8 } },
        },
      }
    },
  })
  const definition = tools.registered.get(tool.TOOL_NAME)!
  const value = await definition.execute({
    state: 'Review the recording and clip.',
    audio,
    videos,
    questions: [{ id: 'q', type: 'noul', instructions: 'Does the audio match the video?' }],
  }, { signal: new AbortController().signal }) as {
    answers: Record<string, { status: string }>
  }
  assert.deepEqual(value.answers.q, {
    status: 'ok',
    answer: { type: 'noul', probabilityTrue: 0.8 },
  })
})

test('bundle mounts the agent tool entry enabled by default', () => {
  const patch = readFileSync('cordis.patch.yml', 'utf8')
  const entry = patch.match(/- id: system1-tool\r?\n(?: {6}.*\r?\n)*/)
  assert.ok(entry, 'system1-tool entry is missing from the bundle patch')
  assert.match(entry[0], /name: dsh-system1\/tool\r?\n/)
  assert.doesNotMatch(entry[0], /disabled/)
})

test('agent tool forwards questions to decide and returns per-question results', async (t) => {
  const { tools } = await setup(t)
  const definition = tools.registered.get(tool.TOOL_NAME)!
  const value = (await definition.execute(args, {
    signal: new AbortController().signal,
  })) as {
    answers: Record<string, { status: string; answer?: unknown; error?: unknown }>
    model: { provider: string; model: string }
  }
  assert.deepEqual(value.answers.refund, {
    status: 'ok',
    answer: { type: 'noul', probabilityTrue: 0.9 },
  })
  assert.equal(
    (value.answers.topic?.answer as { value: string }).value,
    'billing',
  )
  assert.deepEqual(value.answers.urgency, {
    status: 'error',
    error: { code: 'unsupported', message: 'no score' },
  })
  assert.deepEqual(value.model, { provider: 'test', model: 'actual' })
  assert.equal('fallbacks' in value, false)
  const text = definition.output.render(args, value)[0]!.text
  assert.match(text, /"probabilityTrue":0\.9/)
})

test('agent tool returns the executed model and failed fallbacks', async (t) => {
  const { ctx, tools } = await setup(
    t,
    { fallbackModels: [{ provider: 'backup', model: 'backup-model' }] },
    {
      ...provider,
      async evaluate() {
        throw new Error('do not expose provider exception details')
      },
    },
  )
  ctx.system1.registerImplementation(decideOperation, 'backup', decisionFixture(provider))
  const definition = tools.registered.get(tool.TOOL_NAME)!

  const value = (await definition.execute(args, {
    signal: new AbortController().signal,
  })) as {
    model: { provider: string; model: string }
    fallbacks?: {
      provider: string
      model: string
      error: { code: string; message: string }
    }[]
  }

  assert.deepEqual(value.model, { provider: 'backup', model: 'actual' })
  assert.deepEqual(value.fallbacks, [
    {
      provider: 'test',
      model: 'requested',
      error: { code: 'provider_error', message: 'Provider evaluation failed.' },
    },
  ])
})

test('agent tool omits model when every configured provider fails', async (t) => {
  const { tools } = await setup(
    t,
    { fallbackModels: [{ provider: 'missing', model: 'backup-model' }] },
    {
      ...provider,
      async evaluate() {
        throw new Error('provider failed')
      },
    },
  )
  const definition = tools.registered.get(tool.TOOL_NAME)!

  const value = (await definition.execute(args, {
    signal: new AbortController().signal,
  })) as Record<string, unknown>

  assert.equal('model' in value, false)
  assert.deepEqual(value.fallbacks, [
    {
      provider: 'test',
      model: 'requested',
      error: { code: 'provider_error', message: 'Provider evaluation failed.' },
    },
    {
      provider: 'missing',
      model: 'backup-model',
      error: {
        code: 'unavailable',
        message: 'Requested provider is not registered.',
      },
    },
  ])
})

test('agent tool rejects malformed questions before calling a provider', async (t) => {
  const { tools } = await setup(t)
  const definition = tools.registered.get(tool.TOOL_NAME)!
  const signal = new AbortController().signal
  await assert.rejects(
    definition.execute({ state: 'x', questions: [] }, { signal }),
    /questions/,
  )
  await assert.rejects(
    definition.execute(
      {
        state: 'x',
        questions: [
          { id: 'a', type: 'noul', instructions: '?' },
          { id: 'a', type: 'noul', instructions: '?' },
        ],
      },
      { signal },
    ),
    /duplicate/,
  )
})
