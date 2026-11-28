import type { OperationDefinition, OperationImplementation, OperationModel, OperationModels } from '../contracts/operation.js';
export interface Registration<I, O, C> {
    readonly provider: OperationImplementation<I, O, C>;
    readonly controller: AbortController;
    readonly warn?: (message: string) => void;
    warnedInvalidCapabilities: boolean;
}
interface OperationRegistration<I, O, C> {
    readonly definition: OperationDefinition<I, O, C>;
    readonly implementations: Map<string, Registration<I, O, C>>;
    readonly controller: AbortController;
}
type ErasedOperation = OperationRegistration<unknown, unknown, unknown>;
export declare class OperationRegistry {
    private readonly operations;
    private readonly listeners;
    disposed: boolean;
    registerOperation<I, O, C>(definition: OperationDefinition<I, O, C>): () => void;
    registerImplementation<I, O, C>(operation: OperationDefinition<I, O, C>, id: string, implementation: OperationImplementation<NoInfer<I>, NoInfer<O>, NoInfer<C>>, warn?: (message: string) => void): () => void;
    get<I, O, C>(definition: OperationDefinition<I, O, C>): OperationRegistration<I, O, C> | undefined;
    entries(): Iterable<ErasedOperation>;
    subscribe(listener: () => void): () => void;
    changed(): void;
    dispose(): void;
    private assertActive;
    private retire;
}
export declare function currentDeployment<I, O, C>(provider: OperationImplementation<I, O, C>): Pick<OperationImplementation<I, O, C>, "execute" | "models">;
export declare function findFixedModel<C>(models: OperationModels<C>, name: string): OperationModel<C> | undefined;
export {};
//# sourceMappingURL=registry.d.ts.map