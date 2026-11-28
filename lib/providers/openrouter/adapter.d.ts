export interface OpenRouterOptions {
    apiKey?: string;
    timeoutMs?: number;
    resolveTimeoutMs?: () => number | undefined;
    resolveApiKey?: () => string | undefined | Promise<string | undefined>;
    fetch?: typeof fetch;
}
/** The opt-in, text-only Decider free route on OpenRouter's alpha Decisions API. */
export declare function createOpenRouterProvider(options?: OpenRouterOptions): import("../../contracts/provider.js").DecideImplementation & import("../decision-implementation.js").DecisionTransport;
//# sourceMappingURL=adapter.d.ts.map