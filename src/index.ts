import { Service, type Context, type Volatile } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { System1Engine } from './core/engine.js'
import { locateOperation, toLocateResult } from './contracts/locate.js'
import { operationIdPattern } from './contracts/operation.js'
import type { LocateInput, LocateResult, LocateSource } from './contracts/locate.js'
import { installSettingsBridge } from './settings-bridge.js'
import type {
  DecideRequest,
  ModelRef,
  OperationDefinition,
  OperationImplementation,
  OperationRunOptions,
  Questions,
  System1Options,
} from './contracts/index.js'

export type * from './contracts/index.js'
export { defineOperation } from './contracts/operation.js'
export { locateOperation, toUtf16Range } from './contracts/locate.js'
export { decideOperation } from './contracts/decide.js'
export { System1InputError, System1OperationDisabledError, System1ProviderError } from './contracts/error.js'

declare module '@deepseek-ai/cordis' {
  interface Context {
    system1: System1Service
  }
  interface Events {
    'loader/volatile-update'(paths: readonly (readonly string[])[]): void
  }
}

const reference = () => Schema.object({
  provider: Schema.string().required(),
  model: Schema.string().required(),
})
const optionalReference = () => Schema.union([Schema.const(undefined), reference()])

export default class System1Service extends Service {
  // Keep the public contract despite Schemastery's invariant object-schema types.
  static Config = Schema.object({
    defaultModel: optionalReference().volatile(),
    fallbackModels: Schema.array(
      reference(),
    ).default([]).volatile(),
    operations: Schema.dict(Schema.object({
      enabled: Schema.boolean(),
      version: Schema.number().min(1).max(Number.MAX_SAFE_INTEGER).step(1),
      defaultModel: optionalReference(),
      fallbackModels: Schema.array(reference()),
      agentEnabled: Schema.boolean(),
    }), Schema.string().pattern(operationIdPattern)).default({}).volatile(),
  }) as unknown as Schema<System1Options, System1Config>
  private readonly engine: System1Engine
  private readonly mountedTools = new Set<string>()
  private decisionToolAttached = false
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
      return {
        ...(defaultModel !== undefined ? { defaultModel } : {}),
        ...(fallbackModels !== undefined ? { fallbackModels } : {}),
        operations: readConfigValue(config.operations),
      }
    })
    this.registerOperation(locateOperation)
    ctx.effect(() => () => this.engine.dispose())
    ctx.on('loader/volatile-update', () => this.engine.operations.registry.changed())
    installSettingsBridge(ctx, this)
  }
  decide<const Q extends Questions>(request: DecideRequest<Q>) {
    return this.engine.decide(request)
  }
  async locate<S extends LocateSource>(
    input: LocateInput<S>,
    options?: OperationRunOptions,
  ): Promise<LocateResult<S>> {
    return toLocateResult<S>(await this.run(locateOperation, input, options))
  }
  registerOperation<I, O, C>(operation: OperationDefinition<I, O, C>) {
    return this.engine.operations.registry.registerOperation(operation)
  }
  registerImplementation<I, O, C>(
    operation: OperationDefinition<I, O, C>,
    id: string,
    provider: OperationImplementation<NoInfer<I>, NoInfer<O>, NoInfer<C>>,
  ) {
    return this.engine.registerImplementation(operation, id, provider, (message) => {
      this.ctx.logger(`dsh-system1 ${id} provider`).warn(message)
    })
  }
  run<I, O, C>(
    operation: OperationDefinition<I, O, C>,
    input: NoInfer<I>,
    options?: OperationRunOptions,
  ) {
    return this.engine.run(operation, input, options)
  }
  getCatalog() {
    return this.engine.operations.getCatalog(this.mountedTools, this.decisionToolAttached)
  }
  subscribeCatalog(listener: () => void) {
    return this.engine.operations.registry.subscribe(listener)
  }
  getAgentTools() {
    return this.engine.operations.getAgentTools()
  }
  isOperationEnabled(id: string): boolean {
    return this.engine.operations.isOperationEnabled(id)
  }
  /** Keep the legacy tool component preference separate from actual tool registration. */
  setDecisionToolAttached(attached: boolean): void {
    if (this.decisionToolAttached === attached) return
    this.decisionToolAttached = attached
    this.engine.operations.registry.changed()
  }
  /** Called by the tool host after a real registration or unregistration. */
  setOperationToolMounted(name: string, mounted: boolean): void {
    if (this.mountedTools.has(name) === mounted) return
    if (mounted) this.mountedTools.add(name)
    else this.mountedTools.delete(name)
    this.engine.operations.registry.changed()
  }
}

interface System1Config {
  defaultModel: Volatile<ModelRef | undefined>
  fallbackModels: Volatile<readonly ModelRef[]>
  operations: Volatile<System1Options['operations']>
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
