import type { Context } from '@deepseek-ai/cordis'
import type {} from 'dsh-system1'

export const inject = ['system1']
export async function apply(ctx: Context) {
  const result = await ctx.system1.decide({
    state: '用户询问退款进度。',
    questions: {
      refund: { type: 'noul', instructions: '用户是否在询问退款？' },
      topic: {
        type: 'choice',
        instructions: '选择主题',
        criteria: { billing: '账单退款', technical: '技术支持' },
      },
      urgency: {
        type: 'score',
        instructions: '判断紧急程度',
        criteria: ['一般', '紧急', '非常紧急'],
      },
    },
  })
  if (result.answers.topic.status === 'ok') {
    const topic: 'billing' | 'technical' = result.answers.topic.answer.value
    return { topic, result }
  }
  return { result }
}
