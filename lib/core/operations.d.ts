import type { OperationCatalog, OperationDefinition, OperationResult, OperationRunOptions, RegisteredOperationTool } from '../contracts/operation.js';
import type { ModelRef, System1Options } from '../contracts/request.js';
import { OperationRegistry } from './registry.js';
export declare class OperationRuntime {
    private readonly resolveOptions;
    readonly registry: OperationRegistry;
    constructor(resolveOptions: () => System1Options);
    isOperationEnabled(id: string, options?: System1Options): boolean;
    assertOperationEnabled(id: string, options?: System1Options): void;
    getCatalog(mountedTools: ReadonlySet<string>, decisionToolAttached: boolean): OperationCatalog;
    getAgentTools(): readonly RegisteredOperationTool[];
    run<I, O, C>(operation: OperationDefinition<I, O, C>, input: I, options?: OperationRunOptions): Promise<OperationResult<O>>;
    private route;
    private isAgentRouteAvailable;
}
export declare function modelChain(defaultModel: ModelRef | undefined, fallbackModels: readonly ModelRef[]): ModelRef[];
//# sourceMappingURL=operations.d.ts.map