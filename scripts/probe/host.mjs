import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'
import { readFileSync, realpathSync } from 'node:fs'
if (!process.argv[2])
  throw new Error(
    'Pass the absolute path of installed @deepseek-ai/dsh/package.json.',
  )
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
  for (const provider of ['typesafe', 'laya', 'cloudflare']) {
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
  console.log(
    `Installed dsh ${manifest.version} loader mounted the service, all three provider components, and the agent tool.`,
  )
  await ctx.loader.root.stop()
  assert.equal(ctx.get('system1'), undefined)
  assert.deepEqual(ctx.tools.schemas(), [])
} finally {
  await fiber.dispose()
}
