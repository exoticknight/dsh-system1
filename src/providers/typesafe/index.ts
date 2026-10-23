import type { Context, Volatile } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import {
  credentialRef,
  isCredentialRefName,
} from '@deepseek-ai/dsh-credentials'
import type {} from '../../index.js'
import { createTypesafeProvider } from './adapter.js'
export { createTypesafeProvider, type TypesafeOptions } from './adapter.js'
export { TYPESAFE_MODELS } from './models.js'

export interface Config {
  id: string
  apiKeyEnv: string
  baseURL?: string | Volatile<string | undefined>
  timeoutMs?: Volatile<number | undefined>
}
interface ConfigInput {
  id?: string | null
  apiKeyEnv?: string | null
  baseURL?: string | null
  timeoutMs?: number | null
}
interface RuntimeConfig {
  id: string
  apiKeyEnv: string
  baseURL: Volatile<string | undefined>
  timeoutMs: Volatile<number | undefined>
}
export const inject = ['system1']
export const Config: Schema<ConfigInput, RuntimeConfig> = Schema.object({
  id: Schema.string().default('typesafe'),
  apiKeyEnv: Schema.string()
    .role('credential-ref')
    .pattern(/^[A-Za-z_][A-Za-z0-9_]*$/u)
    .default('TYPESAFE_API_KEY'),
  baseURL: Schema.string().volatile(),
  timeoutMs: Schema.number().min(1).max(2147483647).step(1).volatile(),
})
export function apply(ctx: Context, config: Config | RuntimeConfig) {
  const provider = createTypesafeProvider({
    apiKey: '',
    resolveApiKey: async () => {
      const ref = config.apiKeyEnv
      if (!isCredentialRefName(ref)) return undefined
      const credentials = ctx.get('credentials')
      if (credentials)
        return (await credentials.resolve(credentialRef(ref)))?.value
      return process.env[ref]
    },
    resolveBaseURL: () => readConfigValue(config.baseURL),
    resolveTimeoutMs: () => readConfigValue(config.timeoutMs),
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
