import type { System1Provider } from '../../contracts/index.js';
export interface MeraGptOptions {
    apiKey?: string;
    baseURL?: string;
    timeoutMs?: number;
    resolveTimeoutMs?: () => number | undefined;
    resolveApiKey?: () => string | undefined | Promise<string | undefined>;
    resolveBaseURL?: () => string | undefined;
    fetch?: typeof fetch;
}
/** Hosted meraGPT Decider 1, which speaks the shared System One wire contract. */
export declare function createMeraGptProvider(options?: MeraGptOptions): System1Provider;
//# sourceMappingURL=adapter.d.ts.map