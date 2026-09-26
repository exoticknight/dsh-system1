import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
if (!process.argv[2])
  throw new Error(
    'Pass the absolute path of installed @deepseek-ai/dsh/package.json.',
  )
const host = pathToFileURL(process.argv[2])
const require = createRequire(host)
const manifest = JSON.parse(readFileSync(host, 'utf8'))
const pluginManifest = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
)
assert.equal(
  pluginManifest.dsh?.compatibility?.dshReleases?.[manifest.version],
  'compatible',
  `Host ${manifest.version} is not marked compatible in dsh.compatibility.dshReleases.`,
)
const load = async (name) => import(pathToFileURL(require.resolve(name)).href)
const { Context } = await load('@deepseek-ai/cordis')
const { Loader } = await load('@deepseek-ai/cordis-plugin-loader')
const { composeEntries } = await load('@deepseek-ai/dsh-app-boot')
const yaml = require('js-yaml')
const patches = yaml.load(readFileSync('cordis.patch.yml', 'utf8'))
const entries = composeEntries([patches], (message) => {
  throw new Error(message)
})
const ctx = new Context()
const fiber = await ctx.plugin(Loader, {
  baseUrl: pathToFileURL(process.cwd() + '/package.json').href,
})
try {
  await ctx.loader.root.update(entries)
  await ctx.loader.await()
  assert.ok(ctx.system1)
  const result = await ctx.system1.decide({
    state: 'fixture',
    questions: { q: { type: 'noul', instructions: 'yes?' } },
    signal: AbortSignal.abort(),
  })
  assert.equal(result.answers.q.error.code, 'cancelled')
  console.log(
    `Installed dsh ${manifest.version} loader mounted the service and both independent provider components.`,
  )
  await ctx.loader.root.stop()
  assert.equal(ctx.get('system1'), undefined)
} finally {
  await fiber.dispose()
}
