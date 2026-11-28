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
  const consumer = `import { Context, Service as CordisService } from '@deepseek-ai/cordis'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import Service, { decideOperation, System1OperationDisabledError } from 'dsh-system1'
import { defineOperation, toUtf16Range, type DecideImplementation, type LocateResult, type Questions, type TextLocateSource } from 'dsh-system1/contracts'
import type {} from 'dsh-system1/client'
import { findProviderModel } from 'dsh-system1/providers'
import * as providers from 'dsh-system1/providers'
import * as typesafe from 'dsh-system1/providers/typesafe'
import { TYPESAFE_MODELS } from 'dsh-system1/providers/typesafe'
import * as laya from 'dsh-system1/providers/laya'
import { LAYA_MODELS } from 'dsh-system1/providers/laya'
import * as liquid from 'dsh-system1/providers/liquid'
import * as meragpt from 'dsh-system1/providers/meragpt'
import { MERAGPT_MODELS } from 'dsh-system1/providers/meragpt'
import * as nace from 'dsh-system1/providers/nace'
import { NACE_MODELS } from 'dsh-system1/providers/nace'
import * as cloudflare from 'dsh-system1/providers/cloudflare'
import { CLOUDFLARE_MODELS } from 'dsh-system1/providers/cloudflare'
import * as openrouter from 'dsh-system1/providers/openrouter'
import * as tool from 'dsh-system1/tool'
import example, { countWords } from './operation.js'
const ctx=new Context()
const service=await ctx.plugin(Service,{defaultModel:{provider:'test',model:'fixture'}})
const provider:DecideImplementation={
  version:decideOperation.version,
  models:{kind:'fixed',models:[{id:'fixture',inputs:['text'],capabilities:{primitives:['choice'],maxQuestions:null,maxChoiceOptions:null,maxScoreLevels:null}}]},
  timeoutMs:()=>800,
  async execute(){return {model:'fixture',result:{answers:{topic:{status:'ok',answer:{type:'choice',value:'a',probabilities:{a:1,b:0}}}}}}},
}
ctx.system1.registerImplementation(decideOperation,'test',provider)
assert.equal(typeof defineOperation,'function')
assert.equal('registerProvider' in ctx.system1,false)
const questions={topic:{type:'choice',instructions:'?',criteria:{a:'A',b:'B'}}} as const satisfies Questions
const result=await ctx.system1.decide({state:'fixture',questions})
if(result.answers.topic.status!=='ok')throw new Error('Consumer failed')
const value:'a'|'b'=result.answers.topic.answer.value
if(value!=='a'||typeof typesafe.apply!=='function')throw new Error('Invalid TypeSafe public entry')
if(!TYPESAFE_MODELS.some(({id})=>id==='jev-latest')||!LAYA_MODELS.some(({id})=>id==='auto'))throw new Error('Missing provider model catalog')
if(typeof liquid.apply!=='function'||typeof liquid.createLiquidProvider!=='function'||liquid.LIQUID_MODELS[0]?.id!=='d1.2')throw new Error('Missing Liquid AI provider entry')
for(const entry of ['icon','locale/en.json','locale/zh.json']) {
  const url=import.meta.resolve('dsh-system1/providers/liquid/'+entry)
  if(!existsSync(new URL(url)))throw new Error('Missing Liquid AI provider asset: '+entry)
}
if(!MERAGPT_MODELS.some(({id})=>id==='decider-1')||typeof meragpt.apply!=='function'||typeof meragpt.createMeraGptProvider!=='function')throw new Error('Missing meraGPT provider entry')
if(NACE_MODELS.map(({id})=>id).join(',')!=='drex-v2.0,drex-max-v1.1,drex-max-finance')throw new Error('Missing pinned Nace model catalog')
if(findProviderModel(CLOUDFLARE_MODELS,'@cf/cloudflare/clef')?.id!=='clef')throw new Error('Provider model alias did not resolve')
if(typeof tool.apply!=='function'||tool.TOOL_NAME!=='system1_decide')throw new Error('Invalid agent tool public entry')
await service.dispose()
const switches=new Context()
const switchedService=await switches.plugin(Service,{operations:{
  decide:{enabled:false},
  locate:{enabled:true},
}})
assert.deepEqual(Object.fromEntries(switches.system1.getCatalog().operations.map(({id,route})=>[id,route.enabled])),{decide:false,locate:true})
await assert.rejects(switches.system1.decide({state:'fixture',questions,model:{provider:'test',model:'fixture'}}),System1OperationDisabledError)
const noLocateRoute=await switches.system1.locate({source:{type:'text',text:'fixture'},instructions:'Find fixture'})
assert.ok(noLocateRoute.status==='error'&&noLocateRoute.reason==='no_applicable_model')
await switchedService.dispose()
if(typeof cloudflare.createCloudflareProvider!=='function')throw new Error('Missing Cloudflare provider export')
if(typeof nace.apply!=='function'||typeof nace.createNaceProvider!=='function')throw new Error('Missing Nace provider exports')
for(const id of ['meragpt','nace']){
  for(const entry of ['icon','locale/en.json','locale/zh.json']){
    assert.ok(existsSync(new URL(import.meta.resolve('dsh-system1/providers/'+id+'/'+entry))))
  }
}
const cases=[
  {id:'typesafe', component:typesafe, model:'jev-preview', executed:'jev-preview', key:'TYPESAFE_API_KEY'},
  {id:'laya', component:laya, model:'auto', executed:'laya-fixture', key:'LAYA_API_KEY'},
  {id:'liquid', component:liquid, model:'d1.2', executed:'d1.2', key:'LIQUID_API_KEY'},
  {id:'meragpt', component:meragpt, model:'sd-1', executed:'decider-1', key:'MERAGPT_API_KEY'},
  {id:'nace', component:nace, model:'drex-v2.0', executed:'drex-v2.0', key:'NACE_API_KEY'},
  {id:'cloudflare', component:cloudflare, model:'@cf/cloudflare/clef-omni', executed:'clef-omni', key:'CLOUDFLARE_API_TOKEN'},
] as const
for(const route of cases)process.env[route.key]='offline-fixture-key'
const traffic:{provider:string,body:Record<string,unknown>}[]=[]
let reachedCancel!:()=>void
const reached=new Promise<void>(resolve=>{reachedCancel=resolve})
globalThis.fetch=async (resource,init)=>{
  const req=new Request(resource,init)
  const id=new URL(req.url).hostname.replace(/\\.invalid$/u,'')
  assert.ok(cases.some(route=>route.id===id),'Only offline fixture URLs may be used')
  assert.equal(req.headers.get('authorization'),'Bearer offline-fixture-key')
  const body=await req.json() as Record<string,unknown>
  traffic.push({provider:id,body})
  if(body.state==='cancel'){
    reachedCancel()
    return new Promise<Response>((_resolve,reject)=>req.signal.addEventListener('abort',()=>reject(req.signal.reason),{once:true}))
  }
  if(new URL(req.url).pathname.endsWith('/v1/locate')){
    assert.equal(id,'nace')
    assert.deepEqual(body,{state:'甲😀乙',instructions:'Find 乙'})
    return Response.json({model:'drex-max-locate',answers:{q:{type:'locate',spans:[{start:3,end:4,text:'乙',score:0.8}]}}})
  }
  const model=typeof body.model==='string'?(id==='cloudflare'?undefined:body.model):id==='laya'?'laya-fixture':undefined
  const answers=Object.fromEntries(Object.entries(body.questions as Record<string,{type:string}>).flatMap(([key,question])=>{
    if(key==='bad')return []
    const value=question.type==='box'
      ? {type:'box',box:{top:0.1,bottom:0.9,left:0.2,right:0.8}}
      : question.type==='boxes'
      ? {type:'boxes',boxes:[
          {box:{top:0.1,bottom:0.3,left:0.1,right:0.4},found:0.8,confidence:0.7},
          {box:{top:0.5,bottom:0.8,left:0.6,right:0.9},found:0.9,confidence:0.8},
        ],count:2,at_least:true}
      : {type:'noul',noul:0.75}
    return [[key,value]]
  }))
  const payload={...(model?{model}:{}),answers,
    ...(id==='nace'?{usage:{input_tokens:2,output_tokens:1},evaluation_time_ms:1,request_id:'offline-fixture'}:{}),
  }
  return Response.json(id==='cloudflare'?{success:true,result:payload,errors:[],messages:[]}:payload)
}
const originalFixtureFetch=globalThis.fetch
globalThis.fetch=async (resource,init)=>{
  const req=new Request(resource,init)
  if(req.url!=='https://openrouter.ai/api/alpha/decisions')return originalFixtureFetch(resource,init)
  assert.equal(req.headers.get('authorization'),'Bearer offline-fixture-key')
  const body=await req.json() as Record<string,unknown>
  assert.equal(body.model,'perplexity/pplx-decider-v1.3:free')
  assert.deepEqual(body.provider,{only:['perplexity'],allow_fallbacks:false,max_price:{prompt:'0',completion:'0',request:'0'}})
  return Response.json({
    model:'perplexity/pplx-decider-v1.3-20261112',
    provider:'Perplexity',
    usage:{input_tokens:2,output_tokens:1,cost:0,is_byok:false},
    answers:{q:{type:'noul',noul:0.75},unexpected:{type:'noul',noul:0.5}},
  })
}
const optIn=new Context()
const optInService=await optIn.plugin(Service,{})
const openrouterModel='perplexity/pplx-decider-v1.3:free'
assert.equal(typeof openrouter.createOpenRouterProvider,'function')
assert.equal(openrouter.OPENROUTER_MODELS[0]?.id,openrouterModel)
process.env.OPENROUTER_API_KEY='offline-fixture-key'
const openrouterFork=await optIn.plugin(openrouter,{})
const openrouterAnswer=await optIn.system1.decide({
  state:'fixture',questions:{q:{type:'noul',instructions:'?'}},model:{provider:'openrouter',model:openrouterModel},
})
assert.equal(openrouterAnswer.answers.q.status,'ok')
assert.deepEqual(Object.keys(openrouterAnswer.answers),['q'])
assert.deepEqual(openrouterAnswer.meta.warnings,['unexpected_answer_ids'])
assert.equal(openrouterAnswer.meta.executed?.provider,'openrouter')
assert.equal(openrouterAnswer.meta.executed?.model,'perplexity/pplx-decider-v1.3-20261112')
await openrouterFork.dispose()
await optInService.dispose()
globalThis.fetch=originalFixtureFetch

const sample={state:'fixture',questions:{q:{type:'noul',instructions:'?'},bad:{type:'noul',instructions:'missing'}}} as const
for(const route of cases){
  const context=new Context()
  const svc=await context.plugin(Service,{defaultModel:{provider:route.id,model:route.model}})
  const mounted=await context.plugin(route.component,{
    id:route.id,apiKeyEnv:route.key,baseURL:'https://'+route.id+'.invalid',
    ...(route.id==='cloudflare'?{accountId:'fixture-account'}:{}),
  })
  const answer=await context.system1.decide(sample)
  assert.equal(answer.answers.q.status,'ok',route.id)
  assert.equal(answer.answers.bad.status,'error',route.id)
  assert.equal(answer.meta.executed?.provider,route.id)
  assert.equal(answer.meta.executed?.model,route.executed)
  assert.equal(answer.meta.requested.model,route.model)
  assert.equal(traffic.at(-1)?.provider,route.id)
  await mounted.dispose()
  const resort=await context.system1.decide(sample)
  assert.equal(resort.answers.q.status==='error'&&resort.answers.q.error.code,'unavailable')
  await svc.dispose()
}
interface AgentTool{
  name:string
  execute(args:unknown,opts:{signal:AbortSignal}):Promise<unknown>
}
class ToolHost extends CordisService{
  readonly registered=new Map<string,AgentTool>()
  constructor(ctx:Context){super(ctx,'tools')}
  register(definition:AgentTool){
    this.registered.set(definition.name,definition)
    return ()=>{this.registered.delete(definition.name)}
  }
}
const combined=new Context()
const combinedService=await combined.plugin(Service,{
  defaultModel:{provider:'unloaded',model:'missing'},
  fallbackModels:[{provider:'typesafe',model:'jev-preview'}],
  operations:{
    'example.count-words':{defaultModel:{provider:'example',model:'local-v1'},agentEnabled:true},
    locate:{
      defaultModel:{provider:'nace',model:'drex-max-locate'},
      fallbackModels:[{provider:'liquid',model:'d1.2'}],
      agentEnabled:true,
    },
  },
})
const combinedProviders=await combined.plugin(providers,{
  ...Object.fromEntries(cases.map(({id})=>[id+'BaseURL','https://'+id+'.invalid'])),
  cloudflareAccountId:'fixture-account',
})
assert.deepEqual(combined.system1.getCatalog().operations.find(({id})=>id==='decide')!.providers.map(({id})=>id).sort(),cases.map(({id})=>id).sort())
const toolHost=await combined.plugin(ToolHost)
const toolPlugin=await combined.plugin(tool)
const tools=combined.get('tools') as unknown as ToolHost
const examplePlugin=await combined.plugin(example)
const exampleResult=await combined.system1.run(countWords,{text:'count these three'})
assert.ok(exampleResult.status==='ok'&&exampleResult.value.words===3)
assert.equal(combined.system1.getCatalog().operations.find(({id})=>id===countWords.id)?.agentAvailable,true)
const exampleTool=tools.registered.get('example_count_words')
assert.ok(exampleTool)
assert.deepEqual(await exampleTool.execute({text:'two words'},{signal:new AbortController().signal}),{words:2})
await examplePlugin.dispose()
assert.equal(tools.registered.has('example_count_words'),false)
assert.equal(combined.system1.getCatalog().operations.some(({id})=>id===countWords.id),false)
const locateTool=tools.registered.get('system1_locate')
assert.ok(locateTool)
const located=await locateTool.execute({source:{type:'text',text:'甲😀乙'},instructions:'Find 乙'},
  {signal:new AbortController().signal}) as LocateResult<TextLocateSource>
assert.ok(located.status==='ok')
assert.deepEqual(located.matches,[{start:2,end:3,text:'乙',matchScore:0.8}])
assert.deepEqual(toUtf16Range('甲😀乙',located.matches[0].start,located.matches[0].end),[3,4])
const beforeImage=traffic.length
const imageResult=await combined.system1.locate({
  source:{type:'image',image:{mediaType:'image/png',data:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/dM0AAAAASUVORK5CYII='}},
  instructions:'Find both regions',
})
assert.ok(imageResult.status==='ok')
assert.equal(imageResult.matches.length,2)
assert.equal(imageResult.matches[0].right,0.4)
assert.equal(imageResult.mayHaveMore,true)
assert.equal(imageResult.meta.attempts[0]?.kind,'skipped')
assert.deepEqual(traffic.slice(beforeImage).map(({provider})=>provider),['liquid'])
const decideTool=tools.registered.get('system1_decide')
assert.ok(decideTool)
const toolResult=await decideTool.execute({
  state:'fixture',images:[{mediaType:'image/png',data:'AAAA'}],
  questions:[{id:'box',type:'box',instructions:'locate'},{id:'bad',type:'noul',instructions:'missing'}],
},{signal:new AbortController().signal}) as {
  model:{provider:string,model:string};answers:Record<string,{status:string}>;fallbacks:{provider:string}[]
}
assert.equal(toolResult.answers.box.status,'ok')
assert.equal(toolResult.answers.bad.status,'error')
assert.deepEqual(toolResult.model,{provider:'typesafe',model:'jev-preview'})
assert.equal(toolResult.fallbacks[0]?.provider,'unloaded')
const explicit=await combined.system1.decide({
  ...sample,model:{provider:'cloudflare',model:'@cf/cloudflare/clef-omni'},
  audio:[{mediaType:'audio/wav',data:'AAAA'}],
})
assert.equal(explicit.meta.executed?.model,'clef-omni')
assert.ok(traffic.at(-1)?.body.audio)
const abort=new AbortController()
const beforeCancel=traffic.length
const pending=combined.system1.decide({...sample,state:'cancel',signal:abort.signal})
await Promise.race([reached,pending.then(()=>{throw new Error('Cancellation fixture never received a request.')})])
abort.abort()
const cancelled=await pending
assert.equal(cancelled.answers.q.status==='error'&&cancelled.answers.q.error.code,'cancelled')
assert.equal(traffic.length,beforeCancel+1)
await toolPlugin.dispose()
assert.equal(tools.registered.has('system1_decide'),false)
assert.equal(tools.registered.has('system1_locate'),false)
assert.equal(combined.system1.getCatalog().operations.find(({id})=>id==='locate')?.agentAvailable,false)
await toolHost.dispose()
await combinedProviders.dispose()
await combinedService.dispose()
console.log('Packed entry points, standalone (including opt-in OpenRouter) and bundled mounts, decision and locate calls, and dynamic Agent tools passed against offline fixtures.')
`
  writeFileSync(join(work, 'consumer.ts'), consumer)
  writeFileSync(join(work, 'operation.ts'), readFileSync(join(work, 'node_modules/dsh-system1/examples/operation.ts')))
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
