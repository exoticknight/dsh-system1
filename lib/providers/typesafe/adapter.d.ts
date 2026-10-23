import type { System1Provider } from '../../contracts/index.js';
export interface TypesafeOptions {
    apiKey: string;
    baseURL?: string;
    timeoutMs?: number;
    resolveTimeoutMs?: () => number | undefined;
    resolveApiKey?: () => string | undefined | Promise<string | undefined>;
    resolveBaseURL?: () => string | undefined;
    fetch?: typeof fetch;
}
export declare function createTypesafeProvider(options: TypesafeOptions): System1Provider;
//# sourceMappingURL=adapter.d.ts.map