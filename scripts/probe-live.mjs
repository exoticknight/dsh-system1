import { existsSync } from 'node:fs'
import { Context } from '@deepseek-ai/cordis'
import System1Service from '../lib/index.js'
import * as typesafe from '../lib/providers/typesafe/index.js'

if (existsSync('.env.local')) process.loadEnvFile('.env.local')
if (!process.env.TYPESAFE_API_KEY?.trim()) {
  console.log(
    'NOT VERIFIED: fill TYPESAFE_API_KEY in .env.local, then run pnpm probe:live.',
  )
  process.exitCode = 2
} else {
  const ctx = new Context()
  const service = await ctx.plugin(System1Service, {
    defaultModel: {
      provider: 'typesafe',
      model: process.env.TYPESAFE_MODEL || 'jev-1.13.0',
    },
    timeoutMs: 10000,
  })
  const provider = await ctx.plugin(typesafe, {})
  try {
    const result = await ctx.system1.decide({
      state: 'The customer asks about a refund.',
      questions: {
        refund: { type: 'noul', instructions: 'Is this about a refund?' },
        topic: {
          type: 'choice',
          instructions: 'Select the topic.',
          criteria: {
            billing: 'Billing or refund',
            technical: 'Technical support',
          },
        },
        urgency: {
          type: 'score',
          instructions: 'Assess urgency.',
          criteria: ['Routine', 'Urgent', 'Critical'],
        },
      },
    })
    console.log(JSON.stringify(result, null, 2))
    if (Object.values(result.answers).some((a) => a.status === 'error'))
      process.exitCode = 1
  } finally {
    await provider.dispose()
    await service.dispose()
  }
}
