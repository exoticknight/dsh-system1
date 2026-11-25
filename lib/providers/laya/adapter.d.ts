export interface LayaOptions {
    apiKey?: string;
    baseURL?: string;
    timeoutMs?: number;
    resolveTimeoutMs?: () => number | undefined;
    resolveApiKey?: () => string | undefined | Promise<string | undefined>;
    resolveBaseURL?: () => string | undefined;
    fetch?: typeof fetch;
}
export declare function createLayaProvider(options: LayaOptions): import("../../index.js").DecideImplementation & import("../decision-implementation.js").DecisionTransport;
//# sourceMappingURL=adapter.d.ts.map