import type { Context, Volatile } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { credentialRef, isCredentialRefName } from '@deepseek-ai/dsh-credentials'
import { decideOperation } from '../../index.js'
import { createOpenRouterProvider } from './adapter.js'

export { createOpenRouterProvider, type OpenRouterOptions } from './adapter.js'
export { OPENROUTER_MODELS } from './models.js'

export interface Config {
  id: string
  apiKeyEnv: string
  timeoutMs?: Volatile<number | undefined>
}
interface ConfigInput {
  id?: string | null
  apiKeyEnv?: string | null
  timeoutMs?: number | null
}
interface RuntimeConfig extends Config {
  timeoutMs: Volatile<number | undefined>
}

export const inject = ['system1']
export const Config: Schema<ConfigInput, RuntimeConfig> = Schema.object({
  id: Schema.string().default('openrouter'),
  apiKeyEnv: Schema.string()
    .role('credential-ref')
    .pattern(/^[A-Za-z_][A-Za-z0-9_]*$/u)
    .default('OPENROUTER_API_KEY'),
  timeoutMs: Schema.number().min(1).max(2147483647).step(1).volatile(),
})

export function apply(ctx: Context, config: Config) {
  const provider = createOpenRouterProvider({
    resolveApiKey: async () => {
      const ref = config.apiKeyEnv
      if (!isCredentialRefName(ref)) return undefined
      const credentials = ctx.get('credentials')
      if (credentials) return (await credentials.resolve(credentialRef(ref)))?.value
      return process.env[ref]
    },
    resolveTimeoutMs: () => config.timeoutMs?.get(),
  })
  ctx.effect(() => ctx.system1.registerImplementation(decideOperation, config.id, provider))
}
