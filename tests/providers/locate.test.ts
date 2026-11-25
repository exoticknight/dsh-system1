import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { Context, Service } from '@deepseek-ai/cordis'
import System1Service, {
  defineOperation,
  locateOperation,
  System1OperationDisabledError,
  toUtf16Range,
  type OperationRouteConfig,
} from '../../src/index.js'
import { createLiquidLocateProvider } from '../../src/providers/liquid/index.js'
import { createNaceLocateProvider } from '../../src/providers/nace/index.js'
import * as tool from '../../src/tool/index.js'

const naceText = { provider: 'nace', model: 'drex-max-locate' }
const naceBox = { provider: 'nace', model: 'drex-max-box' }
const liquid = { provider: 'liquid', model: 'd1.2' }
const rawText = '  甲😀乙／乙\n'
const text = {
  source: { type: 'text', text: rawText },
  instructions: '找出每一个乙',
} as const
const image = {
  source: { type: 'image', image: {
    mediaType: 'image/png',
    data: readFileSync('tests/fixtures/locate-two-markers.png').toString('base64'),
  } },
  instructions: 'Find both orange rectangles.',
} as const

const liquidSpans = (spans: object[], atLeast = false) => json(liquid.model, {
  type: 'spans', spans, at_least: atLeast, count: spans.length,
})
const naceSpans = (spans: object[]) => json(naceText.model, { type: 'locate', spans })
const json = (model: string, q: object) => Response.json({ model, answers: { q } })
const matches = [
  { text: '乙', span: [4, 5], found: 0.93 },
  { text: '乙', span: [6, 7], found: 0.86 },
]

function fetchWith(run: (path: string, body: Record<string, unknown>, signal: AbortSignal) => Response | Promise<Response>): typeof fetch {
  return async (url, init) => {
    assert.equal(init?.method, 'POST')
    assert.equal(init?.redirect, 'error')
    assert.match(new Headers(init.headers).get('Authorization') ?? '', /^Bearer fixture-/)
    assert.ok(typeof init.body === 'string')
    assert.ok(init.signal)
    return run(new URL(String(url)).pathname, JSON.parse(init.body), init.signal)
  }
}

async function setup(
  t: { after(fn: () => Promise<unknown>): void },
  route?: OperationRouteConfig,
) {
  const ctx = new Context()
  const scope = await ctx.plugin(System1Service, route ? { operations: { locate: route } } : {})
  t.after(() => scope.dispose())
  return ctx
}

test('text adapters preserve whitespace, repeated spans and non-BMP locations', async (t) => {
  const disabled = await setup(t)
  assert.equal(disabled.system1.getCatalog().operations.find(({ id }) => id === 'locate')?.route.enabled, false)
  await assert.rejects(disabled.system1.locate(text, { model: naceText }), System1OperationDisabledError)
  const ctx = await setup(t, { enabled: true })
  let expectedText = rawText
  let naceReply = [{ start: 5, end: 6, text: '乙', score: 0.9 }, { start: 7, end: 8, text: '乙', score: 0.8 }]
  ctx.system1.registerImplementation(locateOperation, 'nace', createNaceLocateProvider({
    apiKey: 'fixture-nace',
    fetch: fetchWith((path, body) => {
      assert.equal(path, '/v1/locate')
      assert.deepEqual(body, { state: expectedText, instructions: text.instructions })
      return naceSpans(naceReply)
    }),
  }))
  ctx.system1.registerImplementation(locateOperation, 'liquid', createLiquidLocateProvider({
    apiKey: 'fixture-liquid',
    fetch: fetchWith((path, body) => {
      assert.equal(path, '/decisions/v1/systemone')
      assert.deepEqual(body, { model: liquid.model, state: rawText, questions: { q: { type: 'spans', instructions: text.instructions } } })
      return liquidSpans(matches, true)
    }),
  }))
  const unconfigured = await ctx.system1.locate(text)
  assert.equal(unconfigured.status === 'error' && unconfigured.reason, 'no_applicable_model')
  const nace = await ctx.system1.locate(text, { model: naceText })
  assert.equal(nace.status, 'ok')
  assert.deepEqual(nace.matches, [
    { start: 4, end: 5, text: '乙', matchScore: 0.9 },
    { start: 6, end: 7, text: '乙', matchScore: 0.8 },
  ])
  assert.deepEqual(nace.matches.map((match) => toUtf16Range(rawText, match.start, match.end)), [[5, 6], [7, 8]])
  assert.ok(nace.matches.every((match) => rawText.slice(...toUtf16Range(rawText, match.start, match.end)) === match.text))
  assert.equal(nace.mayHaveMore, undefined)
  const reply = await ctx.system1.locate(text, { model: liquid })
  assert.equal(reply.status, 'ok')
  assert.equal(reply.mayHaveMore, true)
  assert.deepEqual(reply.matches.map(({ presenceProbability }) => presenceProbability), [0.93, 0.86])

  naceReply = [{ start: 4, end: 5, text: '乙', score: 0.9 }, { start: 7, end: 8, text: '乙', score: 0.8 }]
  const mixedUnits = await ctx.system1.locate(text, { model: naceText })
  assert.equal(mixedUnits.status === 'error' && mixedUnits.error.code, 'invalid_response')
  assert.equal('matches' in mixedUnits, false)

  expectedText = '😀aaa'
  naceReply = [{ start: 2, end: 3, text: 'a', score: 0.9 }]
  const ambiguous = await ctx.system1.locate({ ...text, source: { type: 'text', text: expectedText } }, { model: naceText })
  assert.equal(ambiguous.status === 'error' && ambiguous.error.code, 'invalid_response')

  expectedText = 'abc abc'
  naceReply = [{ start: 4, end: 7, text: 'abc', score: 0.9 }]
  const ascii = await ctx.system1.locate({ ...text, source: { type: 'text', text: expectedText } }, { model: naceText })
  assert.equal(ascii.status, 'ok')
  assert.deepEqual(ascii.matches, [{ start: 4, end: 7, text: 'abc', matchScore: 0.9 }])
})

test('empty Locate succeeds; timeout tries the next model, cancellation and Nace 403 stop', async (t) => {
  const ctx = await setup(t, { defaultModel: naceText, fallbackModels: [liquid] })
  let mode: 'empty' | 'timeout' | 'cancel' | 'retention' | 'slow_403' = 'empty'
  let secondCalls = 0
  const controller = new AbortController()
  ctx.system1.registerImplementation(locateOperation, 'nace', createNaceLocateProvider({
    apiKey: 'fixture-nace',
    timeoutMs: 50,
    fetch: fetchWith((_path, _body, signal) => {
      if (mode === 'empty') return naceSpans([])
      if (mode === 'retention') return Response.json({
        error: { code: 'zero_retention_unavailable', message: 'must stay in this account' },
      }, { status: 403 })
      if (mode === 'slow_403') {
        const body = new ReadableStream<Uint8Array>({
          start(stream) {
            stream.enqueue(new TextEncoder().encode('{"error":{"code":"zero_retention_unavailable"'))
          },
          cancel: () => new Promise(() => {}),
        })
        return new Response(body, { status: 403 })
      }
      if (mode === 'cancel') controller.abort()
      if (signal.aborted) return Promise.reject(signal.reason)
      return new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }))
    }),
  }))
  ctx.system1.registerImplementation(locateOperation, 'liquid', createLiquidLocateProvider({
    apiKey: 'fixture-liquid',
    fetch: fetchWith(() => {
      secondCalls++
      return liquidSpans(matches)
    }),
  }))
  const empty = await ctx.system1.locate(text)
  assert.equal(empty.status, 'ok')
  assert.deepEqual(empty.matches, [])
  assert.equal(secondCalls, 0)

  mode = 'timeout'
  const recovered = await ctx.system1.locate(text)
  assert.equal(recovered.status, 'ok')
  assert.deepEqual(recovered.meta.executed, liquid)
  assert.equal(recovered.meta.attempts[0]?.error?.code, 'timeout')
  assert.equal(secondCalls, 1)

  mode = 'cancel'
  const cancelled = await ctx.system1.locate(text, { signal: controller.signal })
  assert.equal(cancelled.status === 'error' && cancelled.reason, 'cancelled')
  assert.equal(secondCalls, 1)

  for (const denied of ['retention', 'slow_403'] as const) {
    mode = denied
    const refusal = await ctx.system1.locate(text)
    assert.equal(refusal.status, 'error')
    assert.equal(refusal.error.httpStatus, 403)
    assert.equal(refusal.meta.attempts.length, 1)
    assert.equal(secondCalls, 1)
  }
})

test('image routing skips the text-only model and maps both rectangle results to the same source pixels', async (t) => {
  const ctx = await setup(t, { defaultModel: naceText, fallbackModels: [liquid] })
  const expectedBoxes = [
    { left: 0.1, top: 0.2, right: 0.375, bottom: 0.53 },
    { left: 0.5875, top: 0.59, right: 0.9, bottom: 0.84 },
  ]
  let naceRequests = 0
  ctx.system1.registerImplementation(locateOperation, 'nace', createNaceLocateProvider({
    apiKey: 'fixture-nace',
    fetch: fetchWith((path, body) => {
      naceRequests++
      assert.equal(path, '/v1/box')
      assert.deepEqual(body, {
        image: `data:image/png;base64,${image.source.image.data}`,
        instructions: image.instructions,
      })
      return json(naceBox.model, { type: 'box', boxes: [
        { bbox: [100, 200, 375, 530], score: 0.9 },
        { bbox: [587.5, 590, 900, 840], score: 0.8 },
      ] })
    }),
  }))
  let mode: 'multiple' | 'empty' | 'missing' = 'multiple'
  ctx.system1.registerImplementation(locateOperation, 'liquid', createLiquidLocateProvider({
    apiKey: 'fixture-liquid',
    fetch: fetchWith((path, body) => {
      assert.equal(path, '/decisions/v1/systemone')
      assert.deepEqual(body.questions, { q: { type: 'boxes', instructions: image.instructions } })
      assert.deepEqual(body.images, [{ content_type: 'image/png', base64: image.source.image.data }])
      if (mode === 'missing') return json(liquid.model, { type: 'boxes', count: 0, at_least: false })
      if (mode === 'empty') return json(liquid.model, { type: 'boxes', boxes: [], count: 0, at_least: false })
      return json(liquid.model, {
        type: 'boxes',
        boxes: expectedBoxes.map((box) => ({ box, found: 0.95, confidence: 0.76 })),
        count: 2,
        at_least: false,
      })
    }),
  }))
  const routed = await ctx.system1.locate(image)
  assert.equal(routed.status, 'ok')
  assert.deepEqual(routed.meta.attempts.map(({ kind }) => kind), ['skipped', 'executed'])
  assert.equal(naceRequests, 0)
  assert.deepEqual(routed.matches, expectedBoxes.map((box) => ({ ...box, presenceProbability: 0.95, locationConfidence: 0.76 })))
  const boxed = await ctx.system1.locate(image, { model: naceBox })
  assert.equal(boxed.status, 'ok')
  assert.deepEqual(boxed.matches.map(({ left, top, right, bottom }) => [left * 160, top * 100, right * 160, bottom * 100]), [
    [16, 20, 60, 53], [94, 59, 144, 84],
  ])

  mode = 'empty'
  const empty = await ctx.system1.locate(image)
  assert.equal(empty.status, 'ok')
  assert.deepEqual(empty.matches, [])
  mode = 'missing'
  const invalid = await ctx.system1.locate(image, { model: liquid })
  assert.equal(invalid.status === 'error' && invalid.error.code, 'invalid_response')
  assert.equal('matches' in invalid, false)
})

test('Locate preflight and missing key do not send source or count as executed', async (t) => {
  const ctx = await setup(t, { defaultModel: naceText, fallbackModels: [liquid] })
  ctx.system1.registerImplementation(locateOperation, 'nace', createNaceLocateProvider({
    apiKey: 'fixture-nace',
    fetch: async () => assert.fail('Nace exceeds its text limit'),
  }))
  ctx.system1.registerImplementation(locateOperation, 'liquid', createLiquidLocateProvider({
    fetch: async () => assert.fail('Liquid has no key'),
  }))
  const result = await ctx.system1.locate({ ...text, source: { type: 'text', text: '甲'.repeat(28_001) } })
  assert.equal(result.status, 'error')
  assert.equal(result.reason, 'no_applicable_model')
  assert.deepEqual(result.meta.attempts.map(({ kind, error }) => [kind, error?.code]), [
    ['skipped', 'limit_exceeded'], ['skipped', 'unavailable'],
  ])
})

interface RegisteredTool {
  readonly name: string
  readonly output: { schema: object; render(args: unknown, value: unknown): { type: string; text: string }[] }
  execute(args: unknown, exec: { signal: AbortSignal }): Promise<unknown>
}
class FakeTools extends Service {
  readonly registered = new Map<string, RegisteredTool>()
  constructor(ctx: Context) {
    super(ctx, 'tools')
  }
  register(definition: RegisteredTool) {
    assert.ok(definition.output.schema, 'the DSH tool registry requires an output schema')
    this.registered.set(definition.name, definition)
    return () => this.registered.delete(definition.name)
  }
}

test('Agent mounts the catalog tool only with a valid enabled main model, then withdraws it', async (t) => {
  const ctx = await setup(t, { defaultModel: liquid, agentEnabled: true })
  const mountedTools = await ctx.plugin(FakeTools)
  const mountedBridge = await ctx.plugin(tool)
  t.after(async () => { await mountedBridge.dispose(); await mountedTools.dispose() })
  const tools = ctx.get('tools') as unknown as FakeTools
  assert.deepEqual([...tools.registered.keys()], ['system1_decide'])
  const remove = ctx.system1.registerImplementation(locateOperation, 'liquid', createLiquidLocateProvider({
    apiKey: 'fixture-liquid',
    fetch: fetchWith(() => liquidSpans(matches)),
  }))
  const locate = tools.registered.get('system1_locate')
  assert.ok(locate)
  const response = await locate.execute(text, { signal: new AbortController().signal })
  assert.equal((response as { status: unknown }).status, 'ok')
  remove()
  assert.deepEqual([...tools.registered.keys()], ['system1_decide'])
  await assert.rejects(() => locate.execute(text, { signal: new AbortController().signal }), /no longer enabled/)
})

test('Agent gives an extension tool the required DSH output descriptor when it supplies no schema', async (t) => {
  const ctx = new Context()
  const svc = await ctx.plugin(System1Service, {
    operations: { 'example.echo': { defaultModel: { provider: 'local', model: 'echo' }, agentEnabled: true } },
  })
  const toolsScope = await ctx.plugin(FakeTools)
  const toolScope = await ctx.plugin(tool)
  t.after(async () => { await toolScope.dispose(); await toolsScope.dispose(); await svc.dispose() })
  const echo = defineOperation<string, string, null>({
    id: 'example.echo', version: 1, title: 'Echo', inputKinds: [{ id: 'text', title: 'Text' }],
    tool: { name: 'example_echo', description: 'Echoes a string.', parameters: { type: 'string' }, toOutput: (result) => result.status === 'ok' ? result.value : result },
    parseInput: String, parseOutput: String, checkCapabilities: () => undefined,
  })
  ctx.system1.registerOperation(echo)
  ctx.system1.registerImplementation(echo, 'local', {
    version: 1, models: { kind: 'fixed', models: [{ id: 'echo', inputs: ['text'], capabilities: null }] },
    timeoutMs: () => 800,
    async execute(input, { model }) { return { model, result: input } },
  })
  const definition = (ctx.get('tools') as unknown as FakeTools).registered.get('example_echo')
  assert.ok(definition)
  const value = await definition.execute('fixture', { signal: new AbortController().signal })
  assert.deepEqual(definition.output.schema, {})
  assert.deepEqual(definition.output.render('fixture', value), [{ type: 'text', text: '"fixture"' }])
})
