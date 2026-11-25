import type { DecideRequest, DecideResponse, System1Options } from '../contracts/request.js';
import type { Questions } from '../contracts/question.js';
import type { OperationAttempt, OperationDefinition, OperationImplementation, OperationResult, OperationRunOptions } from '../contracts/operation.js';
import { OperationRuntime } from './operations.js';
export declare class System1Engine {
    readonly operations: OperationRuntime;
    private readonly resolveOptions;
    constructor(options?: System1Options | (() => System1Options));
    private validateOptions;
    registerImplementation<I, O, C>(operation: OperationDefinition<I, O, C>, id: string, provider: OperationImplementation<NoInfer<I>, NoInfer<O>, NoInfer<C>>, warn?: (message: string) => void): () => void;
    dispose(): void;
    run<I, O, C>(operation: OperationDefinition<I, O, C>, input: NoInfer<I>, options?: OperationRunOptions): Promise<OperationResult<O>>;
    decide<const Q extends Questions>(input: DecideRequest<Q>, operationAttempts?: OperationAttempt[]): Promise<DecideResponse<Q>>;
    private attempt;
}
//# sourceMappingURL=engine.d.ts.map