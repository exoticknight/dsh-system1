import type { ModelCapabilities, ProviderRequest } from '../../contracts/index.js';
export interface NaceOptions {
    apiKey: string;
    baseURL?: string;
    timeoutMs?: number;
    resolveTimeoutMs?: () => number | undefined;
    resolveApiKey?: () => string | undefined | Promise<string | undefined>;
    resolveBaseURL?: () => string | undefined;
    fetch?: typeof fetch;
    warn?: (message: string) => void;
}
/** Nace Drex adapter: the official SDK owns API and temporary-file transport. */
export declare function createNaceProvider(options: NaceOptions): {
    version: number;
    timeoutMs: (() => number) & (() => number);
    execute(input: import("../../contracts/provider.js").DecideInput, context: import("../../contracts/operation.js").OperationExecution): Promise<import("../../contracts/operation.js").OperationProviderResult<import("../../contracts/provider.js").DecideOutput>>;
    describe(model: string, signal: AbortSignal): Promise<ModelCapabilities>;
    evaluate(request: ProviderRequest, signal: AbortSignal): Promise<import("../../contracts/provider.js").ProviderResponse>;
    models: import("../../contracts/operation.js").OperationModels<ModelCapabilities>;
    resolveDeployment(): {
        models: import("../../contracts/operation.js").OperationModels<ModelCapabilities>;
        execute: (input: import("../../contracts/provider.js").DecideInput, context: import("../../contracts/operation.js").OperationExecution) => Promise<import("../../contracts/operation.js").OperationProviderResult<import("../../contracts/provider.js").DecideOutput>>;
    };
};
//# sourceMappingURL=adapter.d.ts.map