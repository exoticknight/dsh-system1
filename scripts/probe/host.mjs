import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { targets } from './targets.mjs'
import { findProviderModel } from '../../lib/providers/models.js'
import { MERAGPT_MODELS } from '../../lib/providers/meragpt/models.js'
if (!process.argv[2])
  throw new Error(
    'Pass the absolute path of installed @deepseek-ai/dsh/package.json; optionally add --live-meragpt.',
  )
const liveMera = process.argv.includes('--live-meragpt')
if (liveMera && existsSync('.env.local')) process.loadEnvFile('.env.local')
const host = pathToFileURL(realpathSync(process.argv[2]))
const require = createRequire(host)
const manifest = JSON.parse(readFileSync(host, 'utf8'))
const pluginManifest = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
)
assert.equal(
  pluginManifest.dsh?.compatibility?.dshReleases?.[manifest.version],
  'compatible',
  `Host ${manifest.version} is not marked compatible in dsh.compatibility.dshReleases.`,
)
const load = async (name) => import(pathToFileURL(require.resolve(name)).href)
const { Context, Service } = await load('@deepseek-ai/cordis')
const { Loader } = await load('@deepseek-ai/cordis-plugin-loader')
const { composeEntries, readPluginMeta } = await load('@deepseek-ai/dsh-app-boot')
const yaml = require('js-yaml')
const patches = yaml.load(readFileSync('cordis.patch.yml', 'utf8'))
if (liveMera) {
  const entry = patches[0].insert.find(({ id }) => id === 'system1-meragpt')
  assert.ok(entry, 'meraGPT provider entry is missing from the bundle patch.')
  entry.config = { ...entry.config, baseURL: targets.meragpt.endpoint() }
}
const system1Entry = patches[0].insert.find(({ id }) => id === 'system1')
assert.ok(system1Entry, 'System1 service entry is missing from the bundle patch.')
system1Entry.config = {
  ...system1Entry.config,
  defaultModel: { provider: '__host_probe_primary__', model: 'primary' },
  fallbackModels: [
    { provider: '__host_probe_fallback__', model: 'backup' },
  ],
}
const entries = composeEntries([patches], (message) => {
  throw new Error(message)
})
// Plugin page titles and descriptions, read the way DSH reads them.
const baseUrl = pathToFileURL(process.cwd() + '/package.json').href
for (const { name } of patches[0].insert) {
  const meta = readPluginMeta(name, baseUrl)
  assert.equal(meta?.error, undefined, meta?.error)
  for (const field of ['title', 'description'])
    for (const locale of ['en', 'zh'])
      assert.ok(meta?.[field]?.[locale], `${name} lacks ${locale} ${field}`)
}
// The host's real tool registry, so the bundle's agent tool entry can mount.
// dsh-tools is not a direct dependency of @deepseek-ai/dsh; resolve it through dsh-app-boot.
const tools = await import(
  pathToFileURL(
    createRequire(require.resolve('@deepseek-ai/dsh-app-boot')).resolve(
      '@deepseek-ai/dsh-tools',
    ),
  ).href
)
// ToolRuntime only hooks its schemas into the system prompt; nothing else is needed here.
class SystemPromptStub extends Service {
  constructor(ctx) {
    super(ctx, 'systemPrompt')
  }
  tools() {
    return () => {}
  }
  section() {
    return () => {}
  }
  getSectionOrder() {
    return []
  }
}
const ctx = new Context()
await ctx.plugin(SystemPromptStub)
await ctx.plugin(tools.default)
const fiber = await ctx.plugin(Loader, {
  baseUrl,
})
try {
  await ctx.loader.root.update(entries)
  await ctx.loader.await()
  assert.ok(ctx.system1)
  const cancelled = await ctx.system1.decide({
    state: 'fixture',
    questions: { q: { type: 'noul', instructions: 'yes?' } },
    signal: AbortSignal.abort(),
  })
  assert.equal(
    cancelled.answers.q.status === 'error' ? cancelled.answers.q.error.code : undefined,
    'cancelled',
  )
  for (const provider of ['typesafe', 'laya', 'nace', 'cloudflare', 'meragpt']) {
    const result = await ctx.system1.decide({
      state: 'fixture',
      questions: { q: { type: 'noul', instructions: 'yes?' } },
      model: { provider, model: '__host_probe_unsupported__' },
    })
    assert.equal(
      result.answers.q.status === 'error' ? result.answers.q.error.code : undefined,
      'unsupported',
      `Provider ${provider} was not mounted or did not validate models without network access.`,
    )
  }
  assert.deepEqual(
    ctx.tools.schemas().map((schema) => schema.name),
    ['system1_decide'],
    'The agent tool component did not register system1_decide.',
  )
  const call = await ctx.tools.execute({
    callId: 'host-probe',
    name: 'system1_decide',
    arguments: {
      state: 'fixture',
      questions: [{ id: 'q', type: 'noul', instructions: 'yes?' }],
      model: { provider: 'typesafe', model: '__host_probe_unsupported__' },
    },
    signal: new AbortController().signal,
  })
  assert.equal(call.isError, false, JSON.stringify(call))
  assert.equal(call.value.answers.q.error?.code, 'unsupported')
  const fallbackCall = await ctx.tools.execute({
    callId: 'host-probe-fallback-output',
    name: 'system1_decide',
    arguments: {
      state: 'fixture',
      questions: [{ id: 'q', type: 'noul', instructions: 'yes?' }],
    },
    signal: new AbortController().signal,
  })
  assert.equal(fallbackCall.isError, false, JSON.stringify(fallbackCall))
  assert.equal('model' in fallbackCall.value, false)
  assert.deepEqual(fallbackCall.value.fallbacks, [
    {
      provider: '__host_probe_primary__',
      model: 'primary',
      error: {
        code: 'unavailable',
        message: 'Requested provider is not registered.',
      },
    },
    {
      provider: '__host_probe_fallback__',
      model: 'backup',
      error: {
        code: 'unavailable',
        message: 'Requested provider is not registered.',
      },
    },
  ])
  if (liveMera) {
    assert.ok(process.env.MERAGPT_API_KEY?.trim(), 'MERAGPT_API_KEY is not set in .env.local.')
    const { state, questions } = targets.meragpt.sample
    const started = performance.now()
    const result = await ctx.system1.decide({
      state,
      questions,
      model: { provider: 'meragpt', model: targets.meragpt.model() },
      timeoutMs: targets.meragpt.timeoutMs,
    })
    const latencyMs = Math.round(performance.now() - started)
    assert.equal(result.meta.executed?.provider, 'meragpt')
    assert.equal(
      result.meta.executed?.model,
      findProviderModel(MERAGPT_MODELS, targets.meragpt.model())?.id,
    )
    for (const id of Object.keys(questions))
      assert.equal(
        result.answers[id].status,
        'ok',
        `MeraGPT answer ${id} failed: ${JSON.stringify(result.answers[id])}`,
      )
    console.log(JSON.stringify({
      status: 'verified',
      target: 'meragpt',
      hostVersion: manifest.version,
      executedModel: result.meta.executed.model,
      latencyMs,
      ...(result.meta.usage ? { usage: result.meta.usage } : {}),
      answerStatuses: Object.fromEntries(
        Object.entries(result.answers).map(([id, answer]) => [id, answer.status]),
      ),
    }, null, 2))
  }
  console.log(
    `Installed dsh ${manifest.version} loader mounted the service, all providers and the agent tool; the real tool registry accepted fallback output.`,
  )
  await ctx.loader.root.stop()
  assert.equal(ctx.get('system1'), undefined)
  assert.deepEqual(ctx.tools.schemas(), [])
} finally {
  await fiber.dispose()
}
