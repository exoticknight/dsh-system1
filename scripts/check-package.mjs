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
        '@deepseek-ai/cordis': '4.0.4',
      },
      devDependencies: {
        '@types/node': '22.20.4',
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
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import Service, { type System1Provider } from 'dsh-system1'
import type { Questions } from 'dsh-system1/contracts'
import type {} from 'dsh-system1/client'
import { findProviderModel } from 'dsh-system1/providers'
import * as typesafe from 'dsh-system1/providers/typesafe'
import { TYPESAFE_MODELS } from 'dsh-system1/providers/typesafe'
import { LAYA_MODELS } from 'dsh-system1/providers/laya'
import * as nace from 'dsh-system1/providers/nace'
import { NACE_MODELS } from 'dsh-system1/providers/nace'
import * as cloudflare from 'dsh-system1/providers/cloudflare'
import { CLOUDFLARE_MODELS } from 'dsh-system1/providers/cloudflare'
import * as tool from 'dsh-system1/tool'
const ctx=new Context()
const service=await ctx.plugin(Service,{defaultModel:{provider:'test',model:'fixture'}})
const provider:System1Provider={timeoutMs(){return 800},async describe(){return {primitives:['choice'],maxQuestions:null,maxChoiceOptions:null,maxScoreLevels:null}},async evaluate(){return {model:'fixture',answers:{topic:{status:'ok',answer:{type:'choice',value:'a',probabilities:{a:1,b:0}}}}}}}
ctx.system1.registerProvider('test',provider)
const questions={topic:{type:'choice',instructions:'?',criteria:{a:'A',b:'B'}}} as const satisfies Questions
const result=await ctx.system1.decide({state:'fixture',questions})
if(result.answers.topic.status!=='ok')throw new Error('Consumer failed')
const value:'a'|'b'=result.answers.topic.answer.value
if(value!=='a'||typeof typesafe.apply!=='function')throw new Error('Invalid TypeSafe public entry')
if(!TYPESAFE_MODELS.some(({id})=>id==='jev-latest')||!LAYA_MODELS.some(({id})=>id==='auto'))throw new Error('Missing provider model catalog')
if(NACE_MODELS.map(({id})=>id).join(',')!=='drex-v2.0,drex-v1.5,drex-max')throw new Error('Missing pinned Nace model catalog')
if(findProviderModel(CLOUDFLARE_MODELS,'@cf/cloudflare/clef')?.id!=='clef')throw new Error('Provider model alias did not resolve')
if(typeof tool.apply!=='function'||tool.TOOL_NAME!=='system1_decide')throw new Error('Invalid agent tool public entry')
await service.dispose()
const cloudflareCtx=new Context()
const cloudflareService=await cloudflareCtx.plugin(Service,{defaultModel:{provider:'cloudflare',model:'unsupported-probe'}})
const cloudflarePlugin=await cloudflareCtx.plugin(cloudflare,{id:'cloudflare',apiKeyEnv:'CLOUDFLARE_API_TOKEN',accountId:'',baseURL:'https://api.cloudflare.com/client/v4'})
if(typeof cloudflare.createCloudflareProvider!=='function')throw new Error('Missing Cloudflare provider export')
const cloudflareResult=await cloudflareCtx.system1.decide({state:'fixture',questions:{q:{type:'noul',instructions:'?'}}})
if(cloudflareResult.answers.q.status!=='error'||cloudflareResult.answers.q.error.code!=='unsupported')throw new Error('Cloudflare Cordis component did not register its provider')
await cloudflarePlugin.dispose()
await cloudflareService.dispose()
if(typeof nace.apply!=='function'||typeof nace.createNaceProvider!=='function')throw new Error('Missing Nace provider exports')
for(const entry of ['icon','locale/en.json','locale/zh.json']){
  const url=import.meta.resolve('dsh-system1/providers/nace/'+entry)
  if(!existsSync(fileURLToPath(url)))throw new Error('Missing Nace package asset: '+entry)
}
const naceCtx=new Context()
const naceService=await naceCtx.plugin(Service,{defaultModel:{provider:'nace',model:'drex-v2.0'}})
const nacePlugin=await naceCtx.plugin(nace,{id:'nace',apiKeyEnv:'DSH_SYSTEM1_PACKAGE_CHECK_NACE_KEY'})
const previousNaceKey=process.env.DSH_SYSTEM1_PACKAGE_CHECK_NACE_KEY
process.env.DSH_SYSTEM1_PACKAGE_CHECK_NACE_KEY=''
try{
  const naceResult=await naceCtx.system1.decide({state:'fixture',questions:{q:{type:'noul',instructions:'?'}}})
  if(naceResult.answers.q.status!=='error'||naceResult.answers.q.error.code!=='unavailable'||naceResult.answers.q.error.message!=='Nace API key is not configured.')throw new Error('Nace Cordis component did not register or require its configured credential')
}finally{
  if(previousNaceKey===undefined)delete process.env.DSH_SYSTEM1_PACKAGE_CHECK_NACE_KEY
  else process.env.DSH_SYSTEM1_PACKAGE_CHECK_NACE_KEY=previousNaceKey
  await nacePlugin.dispose()
  await naceService.dispose()
}
console.log('Isolated package imports, consumer types and provider Cordis mounts passed.')
`
  writeFileSync(join(work, 'consumer.ts'), consumer)
  run(
    [
      '--ignoreConfig',
      '--module',
      'NodeNext',
      '--target',
      'ES2022',
      '--types',
      'node',
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
