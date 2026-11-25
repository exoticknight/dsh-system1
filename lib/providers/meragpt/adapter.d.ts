export interface MeraGptOptions {
    apiKey?: string;
    baseURL?: string;
    timeoutMs?: number;
    resolveTimeoutMs?: () => number | undefined;
    resolveApiKey?: () => string | undefined | Promise<string | undefined>;
    resolveBaseURL?: () => string | undefined;
    fetch?: typeof fetch;
}
/** Hosted meraGPT Decider 1.1, which speaks the shared System One wire contract. */
export declare function createMeraGptProvider(options?: MeraGptOptions): import("../../index.js").DecideImplementation & import("../decision-implementation.js").DecisionTransport;
//# sourceMappingURL=adapter.d.ts.map