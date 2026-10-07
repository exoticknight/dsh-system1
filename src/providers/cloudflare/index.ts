import type { Context, Volatile } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import {
  credentialRef,
  isCredentialRefName,
} from '@deepseek-ai/dsh-credentials'
import type {} from '../../index.js'
import { createCloudflareProvider } from './adapter.js'
export { createCloudflareProvider, type CloudflareOptions } from './adapter.js'

export interface Config {
  id: string
  apiKeyEnv: string
  accountId: string | Volatile<string>
  baseURL: string | Volatile<string>
}
interface ConfigInput {
  id?: string | null
  apiKeyEnv?: string | null
  accountId?: string | null
  baseURL?: string | null
}
interface RuntimeConfig {
  id: string
  apiKeyEnv: string
  accountId: Volatile<string>
  baseURL: Volatile<string>
}

export const inject = ['system1']
export const Config: Schema<ConfigInput, RuntimeConfig> = Schema.object({
  id: Schema.string().default('cloudflare'),
  apiKeyEnv: Schema.string()
    .role('credential-ref')
    .pattern(/^[A-Za-z_][A-Za-z0-9_]*$/u)
    .default('CLOUDFLARE_API_TOKEN'),
  accountId: Schema.string().default('').volatile(),
  baseURL: Schema.string()
    .default('https://api.cloudflare.com/client/v4')
    .volatile(),
})

export function apply(ctx: Context, config: Config | RuntimeConfig) {
  const provider = createCloudflareProvider({
    resolveApiKey: async () => {
      const ref = config.apiKeyEnv
      if (!isCredentialRefName(ref)) return undefined
      const credentials = ctx.get('credentials')
      if (credentials)
        return (await credentials.resolve(credentialRef(ref)))?.value
      return process.env[ref]
    },
    resolveAccountId: () => readConfigValue<string>(config.accountId)?.trim() || process.env.CLOUDFLARE_ACCOUNT_ID,
    resolveBaseURL: () => readConfigValue<string>(config.baseURL),
  })
  ctx.effect(() => ctx.system1.registerProvider(config.id, provider))
}

function readConfigValue<T>(value: T | Volatile<T> | undefined): T | undefined {
  if (
    value !== null &&
    typeof value === 'object' &&
    'get' in value &&
    typeof value.get === 'function'
  )
    return value.get() as T
  return value as T | undefined
}
