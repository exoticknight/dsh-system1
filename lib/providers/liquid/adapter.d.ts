import type { System1Provider } from '../../contracts/index.js';
export interface LiquidOptions {
    apiKey?: string;
    baseURL?: string;
    timeoutMs?: number;
    resolveTimeoutMs?: () => number | undefined;
    resolveApiKey?: () => string | undefined | Promise<string | undefined>;
    resolveBaseURL?: () => string | undefined;
    fetch?: typeof fetch;
}
export declare function createLiquidProvider(options?: LiquidOptions): System1Provider;
//# sourceMappingURL=adapter.d.ts.map