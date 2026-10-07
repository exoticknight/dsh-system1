import { Service, type Context, type Volatile } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { System1Engine } from './core/engine.js'
import type {
  DecideRequest,
  ModelRef,
  Questions,
  System1Options,
  System1Provider,
} from './contracts/index.js'

export type * from './contracts/index.js'
export { System1InputError, System1ProviderError } from './contracts/error.js'

declare module '@deepseek-ai/cordis' {
  interface Context {
    system1: System1Service
  }
}

export default class System1Service extends Service {
  // Keep the public contract despite Schemastery's invariant object-schema types.
  static Config = Schema.object({
    defaultModel: Schema.union([
      Schema.const(undefined),
      Schema.object({
        provider: Schema.string().required(),
        model: Schema.string().required(),
      }),
    ]).volatile(),
    fallbackModels: Schema.array(
      Schema.object({
        provider: Schema.string().required(),
        model: Schema.string().required(),
      }),
    ).default([]).volatile(),
    timeoutMs: Schema.number()
      .min(1)
      .max(2147483647)
      .step(1)
      .default(800)
      .volatile(),
  }) as unknown as Schema<System1Options, System1Config>
  private readonly engine: System1Engine
  constructor(ctx: Context, config: System1Config | System1Options = {}) {
    super(ctx, 'system1')
    this.engine = new System1Engine(() => {
      const defaultModel = readConfigValue<ModelRef | undefined>(
        config.defaultModel as
          | ModelRef
          | undefined
          | Volatile<ModelRef | undefined>,
      )
      const fallbackModels = readConfigValue<readonly ModelRef[]>(
        config.fallbackModels as
          | readonly ModelRef[]
          | Volatile<readonly ModelRef[]>
          | undefined,
      )
      const timeoutMs = readConfigValue<number>(
        config.timeoutMs as number | Volatile<number> | undefined,
      )
      return {
        ...(defaultModel !== undefined ? { defaultModel } : {}),
        ...(fallbackModels !== undefined ? { fallbackModels } : {}),
        ...(timeoutMs !== undefined ? { timeoutMs } : {}),
      }
    })
    ctx.effect(() => () => this.engine.dispose())
  }
  decide<const Q extends Questions>(request: DecideRequest<Q>) {
    return this.engine.decide(request)
  }
  registerProvider(id: string, provider: System1Provider) {
    return this.engine.registerProvider(id, provider)
  }
}

interface System1Config {
  defaultModel: Volatile<ModelRef | undefined>
  fallbackModels: Volatile<readonly ModelRef[]>
  timeoutMs: Volatile<number>
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
