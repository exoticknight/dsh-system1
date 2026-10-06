import assert from 'node:assert/strict'
import * as cloudflare from '../../lib/providers/cloudflare/index.js'
import * as laya from '../../lib/providers/laya/index.js'
import * as typesafe from '../../lib/providers/typesafe/index.js'
import { CLEF_REVISION } from './local.mjs'

const english = {
  state: 'A customer says a refund has been pending for two weeks and asks for help.',
  questions: {
    refund: { type: 'noul', instructions: 'Is the customer asking about a refund?' },
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
}

// Laya routes Chinese input to the multilingual checkpoint, which the
// documented local setup preloads.
const chinese = {
  state: '客户说：我上个月被重复扣款两次，请尽快退还。',
  questions: {
    refund: { type: 'noul', instructions: '这条请求是否涉及退款？' },
    topic: {
      type: 'choice',
      instructions: '选择最相关的请求类别。',
      criteria: { billing: '账单、重复扣款或退款', technical: '产品故障或技术支持' },
    },
    urgency: {
      type: 'score',
      instructions: '评估这条请求的紧急程度。',
      criteria: ['常规', '紧急', '严重'],
    },
  },
}

/**
 * Each target mounts one provider through the public plugin entry, names the
 * environment it needs, and may add a health preflight or result checks.
 */
export const targets = {
  typesafe: {
    kind: 'hosted',
    requiredEnv: ['TYPESAFE_API_KEY'],
    model: () => process.env.TYPESAFE_MODEL || 'jev-1.13.0',
    timeoutMs: 10_000,
    sample: english,
    mount: (ctx) => ctx.plugin(typesafe, { id: 'typesafe' }),
  },

  cloudflare: {
    kind: 'hosted',
    requiredEnv: ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'],
    model: () => process.env.CLOUDFLARE_MODEL || 'clef-flash',
    timeoutMs: 20_000,
    sample: english,
    mount: (ctx) => ctx.plugin(cloudflare, { id: 'cloudflare' }),
  },

  laya: {
    kind: 'local',
    requiredEnv: [],
    model: () => process.env.LAYA_MODEL || 'auto',
    timeoutMs: Number(process.env.LAYA_TIMEOUT_MS || 60_000),
    sample: chinese,
    endpoint: () => process.env.LAYA_BASE_URL || 'http://127.0.0.1:8000',
    mount: (ctx, endpoint) =>
      ctx.plugin(laya, { id: 'laya', apiKeyEnv: 'LAYA_API_KEY', baseURL: endpoint }),
    health: async (endpoint) => {
      const health = await getHealth(endpoint, process.env.LAYA_API_KEY)
      assert.equal(health.status, 'ok')
      return health
    },
    verify: ({ result, health }) => {
      // The response's top-level model is a service name; the executed model
      // must be the routed checkpoint that /health reports as loaded.
      const model = result.meta.executed.model
      assert.ok(
        Object.hasOwn(health.revisions ?? {}, model),
        `executed model ${model} is not a checkpoint loaded by the Laya service`,
      )
      return {
        checkpoint: model,
        revision: health.revisions[model],
        device: health.checkpoint_devices?.[model],
      }
    },
  },

  'clef-local': {
    kind: 'local',
    requiredEnv: [],
    model: () => 'clef-flash',
    timeoutMs: 300_000,
    sample: english,
    // A 1 ms request would leave CPU inference running and delay later work.
    skipShortTimeout: true,
    endpoint: () => `http://127.0.0.1:${Number(process.env.CLEF_LOCAL_PORT || 8765)}`,
    mount: (ctx, endpoint) => {
      // The local wrapper mirrors the Workers AI route and ignores credentials.
      process.env.DSH_SYSTEM1_CLEF_LOCAL_TOKEN = 'local-probe-token'
      return ctx.plugin(cloudflare, {
        id: 'clef-local',
        apiKeyEnv: 'DSH_SYSTEM1_CLEF_LOCAL_TOKEN',
        accountId: 'local-probe-account',
        baseURL: `${endpoint}/client/v4`,
      })
    },
    health: async (endpoint) => {
      const health = await getHealth(endpoint)
      assert.equal(health.status, 'ok')
      assert.equal(health.loaded, true)
      assert.equal(health.model, 'clef-flash')
      assert.equal(health.revision, CLEF_REVISION)
      return health
    },
    verify: ({ result, health }) => {
      assert.equal(result.meta.executed.model, 'clef-flash')
      const { quantization, head } = health.runtime ?? {}
      return { revision: health.revision, device: health.device, quantization, head }
    },
  },
}

async function getHealth(endpoint, apiKey) {
  const response = await fetch(`${endpoint.replace(/\/+$/u, '')}/health`, {
    headers: apiKey?.trim() ? { Authorization: `Bearer ${apiKey.trim()}` } : {},
    signal: AbortSignal.timeout(10_000),
  })
  assert.equal(response.ok, true, `health returned HTTP ${response.status}`)
  return response.json()
}
