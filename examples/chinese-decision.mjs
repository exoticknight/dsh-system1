// Start the upstream 0.8B Q8_0 CPU HTTP server first:
// https://github.com/yanqiangmiffy/chinese-decision#readme
// Run with Node. The optional first argument overrides http://127.0.0.1:8787.
import { Context } from '@deepseek-ai/cordis'
import System1Service from 'dsh-system1'
import * as chineseDecision from 'dsh-system1/providers/chinese-decision'

const ctx = new Context()
const service = await ctx.plugin(System1Service)
try {
  const baseURL = process.argv[2]
  const provider = await ctx.plugin(chineseDecision, baseURL ? { baseURL } : {})
  try {
    const result = await ctx.system1.decide({
      model: { provider: 'chinese-decision', model: 'chinese-decision-0.8b' },
      state: '客户：取消订单后仍然重复扣款，请退还这一笔。服务目前可用。',
      questions: {
        refund: { type: 'noul', instructions: '客户是否明确要求退款？' },
        team: { type: 'choice', instructions: '该转给哪个团队？', criteria: {
          billing: '扣款、退款、账单', technical: '产品故障', account: '登录或验证码',
        } },
        urgency: { type: 'score', instructions: '按影响范围评严重度。', criteria: [
          '正常：服务可用', '严重：所有客户都不能完成核心操作',
        ] },
      },
    })
    console.log(JSON.stringify(result, null, 2))
    if (Object.values(result.answers).some(({ status }) => status !== 'ok'))
      process.exitCode = 1
  } finally {
    await provider.dispose()
  }
} finally {
  await service.dispose()
}
