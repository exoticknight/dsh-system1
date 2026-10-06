// Usage: node scripts/test.mjs [plugin|providers|<provider>...]
// No argument runs everything; a provider name runs tests/providers/<name>.test.ts.
import { readdirSync } from 'node:fs'
import { delimiter, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const groups = ['plugin', 'providers']
const providers = readdirSync('tests/providers')
  .filter((file) => file.endsWith('.test.ts'))
  .map((file) => file.slice(0, -'.test.ts'.length))

const selected = process.argv.slice(2)
const unknown = selected.filter((name) => !groups.includes(name) && !providers.includes(name))
if (unknown.length) {
  console.error(`Unknown test target: ${unknown.join(', ')}`)
  console.error(`Targets: ${[...groups, ...providers].join(', ')}`)
  process.exit(2)
}

const patterns = selected.length === 0
  ? ['.test-build/tests/**/*.test.js']
  : selected.map((name) =>
      groups.includes(name)
        ? `.test-build/tests/${name}/*.test.js`
        : `.test-build/tests/providers/${name}.test.js`,
    )

run('tsc', ['-p', 'tsconfig.test.json'])
run(process.execPath, ['--test', ...patterns])

function run(command, args) {
  const PATH = [resolve('node_modules/.bin'), process.env.PATH].join(delimiter)
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: command !== process.execPath,
    env: { ...process.env, PATH },
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
