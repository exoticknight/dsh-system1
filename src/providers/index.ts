import type { Context, Volatile } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import type {} from '../index.js'
import { apply as applyCloudflare } from './cloudflare/index.js'
import { apply as applyLaya } from './laya/index.js'
import { apply as applyTypesafe } from './typesafe/index.js'

interface ConfigInput {
  typesafeBaseURL?: string | null
  layaBaseURL?: string | null
  cloudflareBaseURL?: string | null
  cloudflareAccountId?: string | null
}
interface RuntimeConfig {
  typesafeBaseURL: Volatile<string>
  layaBaseURL: Volatile<string>
  cloudflareBaseURL: Volatile<string>
  cloudflareAccountId: Volatile<string>
}

export const inject = ['system1']
export const Config: Schema<ConfigInput, RuntimeConfig> = Schema.object({
  typesafeBaseURL: Schema.string().default('https://api.typesafe.ai').volatile(),
  layaBaseURL: Schema.string().default('http://127.0.0.1:8000').volatile(),
  cloudflareBaseURL: Schema.string()
    .default('https://api.cloudflare.com/client/v4')
    .volatile(),
  cloudflareAccountId: Schema.string().default('').volatile(),
})

/** One DSH component exposes the distinct provider routes. */
export function apply(ctx: Context, config: RuntimeConfig): void {
  applyTypesafe(ctx, {
    id: 'typesafe',
    apiKeyEnv: 'TYPESAFE_API_KEY',
    baseURL: config.typesafeBaseURL,
  })
  applyLaya(ctx, {
    id: 'laya',
    apiKeyEnv: 'LAYA_API_KEY',
    baseURL: config.layaBaseURL,
  })
  applyCloudflare(ctx, {
    id: 'cloudflare',
    apiKeyEnv: 'CLOUDFLARE_API_TOKEN',
    baseURL: config.cloudflareBaseURL,
    accountId: config.cloudflareAccountId,
  })
}
