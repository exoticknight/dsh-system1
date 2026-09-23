import { Service, type Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { System1Engine } from './core/engine.js'
import type {
  DecideRequest,
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
  static Config: Schema<System1Options> = Schema.object({
    defaultModel: Schema.union([
      Schema.const(undefined),
      Schema.object({
        provider: Schema.string().required(),
        model: Schema.string().required(),
      }),
    ]),
    timeoutMs: Schema.number().min(1).max(2147483647).step(1).default(800),
  })
  private readonly engine: System1Engine
  constructor(ctx: Context, config: System1Options = {}) {
    super(ctx, 'system1')
    this.engine = new System1Engine(config)
    ctx.effect(() => () => this.engine.dispose())
  }
  decide<const Q extends Questions>(request: DecideRequest<Q>) {
    return this.engine.decide(request)
  }
  registerProvider(id: string, provider: System1Provider) {
    return this.engine.registerProvider(id, provider)
  }
}
