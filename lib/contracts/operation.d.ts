import type { DecisionError } from './error.js';
import type { JsonValue } from './question.js';
import type { ExecutionModel, ModelRef } from './request.js';
export declare const operationIdPattern: RegExp;
export interface OperationInputKind {
    readonly id: string;
    readonly title: string;
    readonly translations?: Readonly<Record<string, string>>;
}
export interface OperationTool<I, O> {
    readonly name: string;
    readonly description: string;
    readonly parameters: Readonly<Record<string, JsonValue>>;
    readonly output?: Readonly<Record<string, JsonValue>>;
    readonly toInput?: (args: unknown) => I;
    readonly toOutput?: (response: OperationResult<O>) => unknown;
}
export interface OperationDefinition<I, O, C> {
    readonly id: string;
    /** Major version of the input, output and error contract. */
    readonly version: number;
    readonly title: string;
    readonly description?: string;
    readonly translations?: Readonly<Record<string, {
        readonly title: string;
        readonly description?: string;
    }>>;
    readonly inputKinds: readonly OperationInputKind[];
    readonly tool?: OperationTool<I, O>;
    /** Validate and normalize caller input to a structured-cloneable value. */
    readonly parseInput: (input: unknown) => I;
    readonly parseOutput: (output: unknown, input: I) => O;
    readonly getInputKind?: (input: I) => string;
    readonly checkCapabilities: (input: I, capabilities: C) => DecisionError | undefined;
}
export declare function defineOperation<I, O, C>(definition: OperationDefinition<I, O, C>): OperationDefinition<I, O, C>;
export interface OperationModel<C> {
    readonly id: string;
    readonly aliases?: readonly string[];
    readonly inputs: readonly string[];
    readonly capabilities: C;
}
export type OperationModels<C> = {
    readonly kind: 'fixed';
    readonly models: readonly OperationModel<C>[];
    readonly unknownModelMessage?: string;
} | {
    readonly kind: 'deployment';
    readonly inputs: readonly string[];
    /** Resolve a deployment within the same time budget as execution, before sending task input. */
    readonly resolve: (model: string, signal: AbortSignal) => Promise<OperationModel<C>>;
};
export interface OperationExecution {
    readonly model: string;
    readonly requestId: string;
    readonly signal: AbortSignal;
}
export interface OperationProviderResult<O> {
    readonly model: string;
    readonly result: O;
    readonly revision?: string;
}
export interface OperationImplementation<I, O, C> {
    readonly version: number;
    readonly models: OperationModels<C>;
    timeoutMs(): number;
    execute(input: I, context: OperationExecution): Promise<OperationProviderResult<O>>;
}
export interface OperationRunOptions {
    readonly model?: ModelRef | undefined;
    readonly signal?: AbortSignal | undefined;
    readonly timeoutMs?: number | undefined;
}
export interface OperationAttempt extends ModelRef {
    /** Skipped candidates did not receive the task input. */
    readonly kind: 'skipped' | 'executed';
    readonly error?: Pick<DecisionError, 'code' | 'message'>;
}
export interface OperationMeta {
    readonly requestId: string;
    readonly requested?: ModelRef;
    readonly executed?: ExecutionModel;
    readonly durationMs: number;
    readonly attempts: readonly OperationAttempt[];
}
export type OperationResult<O> = {
    readonly status: 'ok';
    readonly value: O;
    readonly meta: OperationMeta;
} | {
    readonly status: 'error';
    readonly reason: 'no_applicable_model' | 'upstream_execution_failed' | 'cancelled';
    readonly error: DecisionError;
    readonly meta: OperationMeta;
};
export interface OperationRouteConfig {
    /** Disable execution without deleting the saved route or Agent preference. */
    readonly enabled?: boolean | undefined;
    /** Absent means version 1; an incompatible version must be explicitly reconfigured. */
    readonly version?: number | undefined;
    readonly defaultModel?: ModelRef | undefined;
    readonly fallbackModels?: readonly ModelRef[] | undefined;
    readonly agentEnabled?: boolean | undefined;
}
export declare function resolveOperationEnabled(id: string, stored?: OperationRouteConfig): boolean;
export interface OperationCatalogEntry {
    readonly id: string;
    readonly version: number;
    readonly title: string;
    readonly description?: string;
    readonly translations?: Readonly<Record<string, {
        readonly title: string;
        readonly description?: string;
    }>>;
    readonly inputKinds: readonly OperationInputKind[];
    readonly tool?: {
        readonly name: string;
        readonly description: string;
    };
    readonly route: {
        readonly enabled: boolean;
        readonly version: number;
        readonly compatible: boolean;
        readonly defaultModel?: ModelRef;
        readonly fallbackModels: readonly ModelRef[];
        readonly agentEnabled: boolean;
    };
    readonly agentAvailable: boolean;
    readonly providers: readonly {
        readonly id: string;
        readonly models: {
            readonly kind: 'fixed';
            readonly models: readonly Omit<OperationModel<never>, 'capabilities'>[];
        } | {
            readonly kind: 'deployment';
            readonly inputs: readonly string[];
        };
    }[];
}
export interface OperationCatalog {
    readonly operations: readonly OperationCatalogEntry[];
}
export interface RegisteredOperationTool {
    readonly name: string;
    readonly description: string;
    readonly parameters: Readonly<Record<string, JsonValue>>;
    readonly output?: Readonly<Record<string, JsonValue>>;
    execute(args: unknown, signal: AbortSignal): Promise<unknown>;
}
//# sourceMappingURL=operation.d.ts.map