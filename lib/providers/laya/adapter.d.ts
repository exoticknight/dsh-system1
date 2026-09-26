import type { System1Provider } from '../../contracts/index.js';
export interface LayaOptions {
    apiKey?: string;
    baseURL?: string;
    resolveApiKey?: () => string | undefined | Promise<string | undefined>;
    resolveBaseURL?: () => string | undefined;
    fetch?: typeof fetch;
}
export declare function createLayaProvider(options: LayaOptions): System1Provider;
//# sourceMappingURL=adapter.d.ts.map