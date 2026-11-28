import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Context } from '@deepseek-ai/cordis'
import System1Service, { decideOperation } from '../../src/index.js'
import type { DecideRequest } from '../../src/contracts/index.js'
import { System1ProviderError } from '../../src/contracts/error.js'
import { createChineseDecisionProvider } from '../../src/providers/chinese-decision/index.js'

const model = { provider: 'chinese-decision', model: 'chinese-decision-0.8b' }
const levels = [
  'normal：正常或仅个别用户受影响，业务整体可继续',
  'critical：所有客户当前不能完成核心操作',
]
const sample = {
  state: '客户：我昨天取消了订单，但今天银行卡又被扣了两次。请退还重复扣款；目前还能正常使用服务。',
  questions: {
    refund: { type: 'noul', instructions: '客户当前是否明确要求退还一笔钱？仅提及退款、明确说不用退款，都判否。' },
    team: { type: 'choice', instructions: '该问题应转给哪个团队？', criteria: {
      billing: '扣款、退款和收费争议。',
      technical: '产品页面或服务发生系统故障。',
      account: '账号开通、登录或验证码问题。',
    } },
    urgency: { type: 'score', instructions: '按当前影响范围评严重度。只有所有客户当前均不能完成核心操作才判严重。', criteria: levels },
  },
} as const satisfies DecideRequest

const teamProbabilities = { billing: 0.9520065248866426, technical: 0.0302317050122387, account: 0.017761770101118627 }
const scoreProbabilities = [0.8070335910625313, 0.19296640893746866]
const refundProbability = 0.6361329611190335
// Recorded from the upstream Chinese Decision 0.8B Q8_0 CPU server on this sample.
const raw = {
  model: model.model,
  answers: {
    refund: { type: 'noul', probabilities: { false: 0.3638670388809665, true: refundProbability }, noul: refundProbability },
    team: { type: 'choice', choice: 'billing', probabilities: teamProbabilities, confidence: 0.928009787329964 },
    urgency: {
      type: 'score', score: scoreProbabilities[1],
      probabilities: { '0': scoreProbabilities[0], '1': scoreProbabilities[1] },
      legend: { '0': levels[0], '1': levels[1] },
      confidence: 0.6140671821250625,
    },
  },
  usage: { input_tokens: 319, output_tokens: 0 },
}

test('Chinese Decision normalizes a real CPU response without credentials', async (t) => {
  const ctx = new Context()
  const service = await ctx.plugin(System1Service)
  t.after(() => service.dispose())
  let sent: Request | undefined
  const provider = createChineseDecisionProvider({
    fetch: async (url, init) => {
      sent = new Request(url, init)
      return Response.json(raw)
    },
  })
  ctx.system1.registerImplementation(decideOperation, model.provider, provider)

  const result = await ctx.system1.decide({ model, ...sample })
  assert.equal(sent?.url, 'http://127.0.0.1:8787/v1/systemone')
  assert.equal(sent?.headers.get('authorization'), null)
  assert.deepEqual(await sent?.json(), { ...sample, model: model.model })
  assert.deepEqual(result.meta.executed, model)
  assert.deepEqual(result.meta.usage, { inputTokens: 319, outputTokens: 0 })
  assert.deepEqual(result.answers, {
    refund: { status: 'ok', answer: { type: 'noul', probabilityTrue: refundProbability } },
    team: { status: 'ok', answer: { type: 'choice', value: 'billing', probabilities: teamProbabilities, confidence: 0.928009787329964 } },
    urgency: {
      status: 'ok',
      answer: { type: 'score', value: scoreProbabilities[1], levels, probabilities: scoreProbabilities, confidence: 0.6140671821250625 },
    },
  })
})

test('Chinese Decision rejects incompatible requests and an endpoint running another model', async (t) => {
  const ctx = new Context()
  const service = await ctx.plugin(System1Service)
  t.after(() => service.dispose())
  let calls = 0
  let reply = Response.json({ ...raw, model: 'chinese-decision-2b' })
  const provider = createChineseDecisionProvider({
    fetch: async () => {
      calls++
      return reply
    },
  })
  ctx.system1.registerImplementation(decideOperation, model.provider, provider)

  const knownRefund = { refund: sample.questions.refund }
  const badRequests: (DecideRequest & { code: string })[] = [
    { model: { ...model, model: 'chinese-decision-2b' }, state: sample.state, questions: knownRefund, code: 'unsupported' },
    { model, state: null, questions: knownRefund, code: 'unsupported' },
    { model, state: sample.state, questions: { team: { ...sample.questions.team, criteria: { billing: '账单' } } }, code: 'unsupported' },
    { model, state: sample.state, questions: { urgency: { ...sample.questions.urgency, criteria: [{ label: '正常' }, '严重'] } }, code: 'unsupported' },
    { model, state: sample.state, questions: {
      urgency: { ...sample.questions.urgency, criteria: Array.from({ length: 27 }, (_, i) => String(i)) },
    }, code: 'limit_exceeded' },
  ]
  for (const { code, ...request } of badRequests) {
    const result = await ctx.system1.decide(request)
    const answer = Object.values(result.answers)[0]
    assert.equal(answer?.status === 'error' && answer.error.code, code)
  }
  await assert.rejects(
    provider.evaluate({
      ...sample,
      model: model.model,
      requestId: 'offline',
      images: [{ mediaType: 'image/png', data: 'AA==' }],
    }, new AbortController().signal),
    (error) => error instanceof System1ProviderError &&
      error.detail.code === 'unsupported' && error.requestSent === false,
  )
  assert.equal(calls, 0)

  const mismatch = await ctx.system1.decide({ model, ...sample })
  assert.equal(mismatch.answers.refund.status === 'error' && mismatch.answers.refund.error.code, 'invalid_response')

  reply = new Response('upstream-only detail', { status: 422 })
  const rejected = await ctx.system1.decide({ model, ...sample })
  assert.deepEqual(rejected.answers.refund, {
    status: 'error',
    error: { code: 'provider_error', message: 'Chinese Decision request failed.', httpStatus: 422, retryable: false },
  })
})
