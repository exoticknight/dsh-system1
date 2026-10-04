import { existsSync } from 'node:fs'
import { Context } from '@deepseek-ai/cordis'
import System1Service from '../lib/index.js'
import * as cloudflare from '../lib/providers/cloudflare/index.js'

if (existsSync('.env.local')) process.loadEnvFile('.env.local')
if (!process.env.CLOUDFLARE_API_TOKEN?.trim() || !process.env.CLOUDFLARE_ACCOUNT_ID?.trim()) {
  console.log(
    'NOT VERIFIED: set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in .env.local; no credential values were printed.',
  )
  process.exitCode = 2
} else {
  const model = process.env.CLOUDFLARE_MODEL || 'clef'
  const ctx = new Context()
  const service = await ctx.plugin(System1Service, {
    defaultModel: { provider: 'cloudflare', model },
    timeoutMs: 20000,
  })
  const provider = await ctx.plugin(cloudflare, {})
  try {
    const result = await ctx.system1.decide({
      state: 'A customer reports that a refund has been pending for two weeks and asks for help.',
      questions: {
        refund_request: {
          type: 'noul',
          instructions: 'Is the customer asking about a refund?',
        },
        topic: {
          type: 'choice',
          instructions: 'Choose the best support team.',
          criteria: {
            billing: 'Payments, invoices, and refunds',
            technical: 'Product errors or outages',
            sales: 'Plans, renewals, and upgrades',
          },
        },
        urgency: {
          type: 'score',
          instructions: 'Rate how urgently this case needs attention.',
          criteria: ['Routine', 'Soon', 'Urgent'],
        },
      },
    })

    const noul = result.answers.refund_request
    const choice = result.answers.topic
    const score = result.answers.urgency
    if (
      noul.status !== 'ok' ||
      !isProbability(noul.answer.probabilityTrue) ||
      choice.status !== 'ok' ||
      !['billing', 'technical', 'sales'].includes(choice.answer.value) ||
      !isDistribution(choice.answer.probabilities, ['billing', 'technical', 'sales']) ||
      score.status !== 'ok' ||
      score.answer.levels.length !== 3 ||
      score.answer.probabilities.length !== 3 ||
      score.answer.probabilities.some((value) => !isProbability(value)) ||
      !isNormalized(score.answer.probabilities)
    ) {
      console.log('FAILED: Cloudflare returned an invalid decision result.')
      process.exitCode = 1
    } else {
      console.log(`VERIFIED: Cloudflare ${model} returned all three primitives and full distributions.`)
    }
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error
      ? String(error.code)
      : 'unexpected_error'
    console.log(`FAILED: Cloudflare probe did not complete (${code}).`)
    process.exitCode = 1
  } finally {
    await provider.dispose()
    await service.dispose()
  }
}

function isProbability(value) {
  return Number.isFinite(value) && value >= 0 && value <= 1
}

function isDistribution(probabilities, keys) {
  return (
    keys.every((key) => isProbability(probabilities[key])) &&
    Object.keys(probabilities).length === keys.length &&
    isNormalized(Object.values(probabilities))
  )
}

function isNormalized(probabilities) {
  return Math.abs(probabilities.reduce((sum, value) => sum + value, 0) - 1) < 0.02
}
