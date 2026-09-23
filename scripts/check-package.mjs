import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs'
import { resolve, join, sep } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = process.cwd()
const pnpm = process.env.npm_execpath
if (!pnpm) throw new Error('Run this check through pnpm check:package.')
const parent = resolve(root, '.package-check')
mkdirSync(parent, { recursive: true })
const work = mkdtempSync(join(parent, 'install-'))
function run(args, cwd = root, entry = pnpm) {
  const result = spawnSync(process.execPath, [entry, ...args], {
    cwd,
    stdio: 'inherit',
  })
  if (result.error) throw result.error
  if (result.status !== 0)
    throw new Error(`Package check command failed (${result.status}).`)
}
try {
  run(['pack', '--pack-destination', work])
  const tarball = readdirSync(work).find((name) => name.endsWith('.tgz'))
  if (!tarball) throw new Error('Missing package archive.')
  writeFileSync(
    join(work, 'package.json'),
    JSON.stringify({
      private: true,
      type: 'module',
      dependencies: {
        'dsh-system1': `file:./${tarball}`,
        '@deepseek-ai/cordis': '4.0.2',
      },
    }),
  )
  // The isolated consumer owns a workspace; it must not join this source workspace.
  writeFileSync(
    join(work, 'pnpm-workspace.yaml'),
    readFileSync(join(root, 'pnpm-workspace.yaml')),
  )
  run(['install', '--ignore-scripts'], work)
  const consumer = `import { Context } from '@deepseek-ai/cordis'
import Service, { type System1Provider } from 'dsh-system1'
import type { Questions } from 'dsh-system1/contracts'
import * as typesafe from 'dsh-system1/providers/typesafe'
const ctx=new Context()
const service=await ctx.plugin(Service,{defaultModel:{provider:'test',model:'fixture'}})
const provider:System1Provider={async describe(){return {primitives:['choice']}},async evaluate(){return {model:'fixture',answers:{topic:{status:'ok',answer:{type:'choice',value:'a',probabilities:{a:1,b:0}}}}}}}
ctx.system1.registerProvider('test',provider)
const questions={topic:{type:'choice',instructions:'?',criteria:{a:'A',b:'B'}}} as const satisfies Questions
const result=await ctx.system1.decide({state:'fixture',questions})
if(result.answers.topic.status!=='ok')throw new Error('Consumer failed')
const value:'a'|'b'=result.answers.topic.answer.value
if(value!=='a'||typeof typesafe.apply!=='function')throw new Error('Invalid public entry')
await service.dispose()
console.log('Isolated package imports, consumer types and Cordis mount passed.')
`
  writeFileSync(join(work, 'consumer.ts'), consumer)
  run(
    [
      '--ignoreConfig',
      '--module',
      'NodeNext',
      '--target',
      'ES2022',
      '--strict',
      '--skipLibCheck',
      'consumer.ts',
    ],
    work,
    resolve(root, 'node_modules/typescript/bin/tsc'),
  )
  const result = spawnSync(process.execPath, ['consumer.js'], {
    cwd: work,
    stdio: 'inherit',
  })
  if (result.error || result.status !== 0)
    throw result.error ?? new Error('Installed package execution failed.')
} finally {
  const target = resolve(work)
  if (!target.startsWith(parent + sep)) throw new Error('Unsafe cleanup path.')
  rmSync(target, { recursive: true, force: true })
}
