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
export declare function createNaceProvider(options: NaceOptions): import("../../contracts/provider.js").DecideImplementation & import("../decision-implementation.js").DecisionTransport;
//# sourceMappingURL=adapter.d.ts.map