import { Service, type Context, type Volatile } from '@deepseek-ai/cordis';
import Schema from '@deepseek-ai/schemastery';
import type { LocateInput, LocateResult, LocateSource } from './contracts/locate.js';
import type { DecideRequest, ModelRef, OperationDefinition, OperationImplementation, OperationRunOptions, Questions, System1Options } from './contracts/index.js';
export type * from './contracts/index.js';
export { defineOperation } from './contracts/operation.js';
export { locateOperation, toUtf16Range } from './contracts/locate.js';
export { decideOperation } from './contracts/decide.js';
export { System1InputError, System1OperationDisabledError, System1ProviderError } from './contracts/error.js';
declare module '@deepseek-ai/cordis' {
    interface Context {
        system1: System1Service;
    }
    interface Events {
        'loader/volatile-update'(paths: readonly (readonly string[])[]): void;
    }
}
export default class System1Service extends Service {
    static Config: Schema<System1Options, System1Config>;
    private readonly engine;
    private readonly mountedTools;
    private decisionToolAttached;
    constructor(ctx: Context, config?: System1Config | System1Options);
    decide<const Q extends Questions>(request: DecideRequest<Q>): Promise<import("./contracts/request.js").DecideResponse<Q>>;
    locate<S extends LocateSource>(input: LocateInput<S>, options?: OperationRunOptions): Promise<LocateResult<S>>;
    registerOperation<I, O, C>(operation: OperationDefinition<I, O, C>): () => void;
    registerImplementation<I, O, C>(operation: OperationDefinition<I, O, C>, id: string, provider: OperationImplementation<NoInfer<I>, NoInfer<O>, NoInfer<C>>): () => void;
    run<I, O, C>(operation: OperationDefinition<I, O, C>, input: NoInfer<I>, options?: OperationRunOptions): Promise<import("./contracts/operation.js").OperationResult<O>>;
    getCatalog(): import("./contracts/operation.js").OperationCatalog;
    subscribeCatalog(listener: () => void): () => void;
    getAgentTools(): readonly import("./contracts/operation.js").RegisteredOperationTool[];
    isOperationEnabled(id: string): boolean;
    /** Keep the legacy tool component preference separate from actual tool registration. */
    setDecisionToolAttached(attached: boolean): void;
    /** Called by the tool host after a real registration or unregistration. */
    setOperationToolMounted(name: string, mounted: boolean): void;
}
interface System1Config {
    defaultModel: Volatile<ModelRef | undefined>;
    fallbackModels: Volatile<readonly ModelRef[]>;
    operations: Volatile<System1Options['operations']>;
}
//# sourceMappingURL=index.d.ts.map