import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { Context, Service } from '@deepseek-ai/cordis'
import System1Service, { type System1Provider } from '../../src/index.js'
import * as tool from '../../src/tool/index.js'

interface Registered {
  name: string
  description: string
  parameters: Record<string, unknown>
  output: { render(args: unknown, value: unknown): { type: string; text: string }[] }
  execute(args: unknown, exec: { signal: AbortSignal }): Promise<unknown>
}

class FakeTools extends Service {
  readonly registered = new Map<string, Registered>()
  constructor(ctx: Context) {
    super(ctx, 'tools')
  }
  register(definition: Registered) {
    this.registered.set(definition.name, definition)
    return () => {
      this.registered.delete(definition.name)
    }
  }
}

const provider: System1Provider = {
  async describe() {
    return { primitives: ['noul', 'choice', 'score'] }
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

async function setup(t: { after(fn: () => Promise<void>): void }) {
  const ctx = new Context()
  const fibers = [
    await ctx.plugin(System1Service, {
      defaultModel: { provider: 'test', model: 'requested' },
    }),
    await ctx.plugin(FakeTools),
  ]
  ctx.system1.registerProvider('test', provider)
  fibers.push(await ctx.plugin(tool))
  t.after(async () => {
    for (const fiber of fibers.reverse()) await fiber.dispose()
  })
  const tools = ctx.get('tools') as unknown as FakeTools
  return { ctx, tools, fiber: fibers[2]! }
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

test('agent tool is registered by default and unregistered on dispose', async (t) => {
  const { tools, fiber } = await setup(t)
  const definition = tools.registered.get(tool.TOOL_NAME)
  assert.ok(definition)
  assert.equal(definition.parameters.type, 'object')
  await fiber.dispose()
  assert.equal(tools.registered.has(tool.TOOL_NAME), false)
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
  const text = definition.output.render(args, value)[0]!.text
  assert.match(text, /"probabilityTrue":0\.9/)
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
