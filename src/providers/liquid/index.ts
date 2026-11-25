import type { Context, Volatile } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import {
  credentialRef,
  isCredentialRefName,
} from '@deepseek-ai/dsh-credentials'
import { decideOperation, locateOperation } from '../../index.js'
import { createLiquidProvider } from './adapter.js'
import type { LiquidOptions } from './adapter.js'
import { createLiquidLocateProvider } from './locate.js'
import { LIQUID_BASE_URL } from './models.js'

export { createLiquidProvider, type LiquidOptions } from './adapter.js'
export { createLiquidLocateProvider } from './locate.js'
export { LIQUID_MODELS } from './models.js'

export interface Config {
  id: string
  apiKeyEnv: string
  baseURL: string | Volatile<string>
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
  baseURL: Volatile<string>
  timeoutMs: Volatile<number | undefined>
}

export const inject = ['system1']
export const Config: Schema<ConfigInput, RuntimeConfig> = Schema.object({
  id: Schema.string().default('liquid'),
  apiKeyEnv: Schema.string()
    .role('credential-ref')
    .pattern(/^[A-Za-z_][A-Za-z0-9_]*$/u)
    .default('LIQUID_API_KEY'),
  baseURL: Schema.string().default(LIQUID_BASE_URL).volatile(),
  timeoutMs: Schema.number().min(1).max(2147483647).step(1).volatile(),
})

export function apply(ctx: Context, config: Config | RuntimeConfig) {
  const options: LiquidOptions = {
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
  }
  const decide = createLiquidProvider(options)
  const locate = createLiquidLocateProvider(options)
  ctx.effect(() => ctx.system1.registerImplementation(decideOperation, config.id, decide))
  ctx.effect(() => ctx.system1.registerImplementation(locateOperation, config.id, locate))
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
