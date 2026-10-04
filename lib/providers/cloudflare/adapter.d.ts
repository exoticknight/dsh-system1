import type { System1Provider } from '../../contracts/index.js';
export interface CloudflareOptions {
    apiKey?: string;
    accountId?: string;
    baseURL?: string;
    resolveApiKey?: () => string | undefined | Promise<string | undefined>;
    resolveAccountId?: () => string | undefined | Promise<string | undefined>;
    resolveBaseURL?: () => string | undefined;
    fetch?: typeof fetch;
}
/** Cloudflare REST transport for the native System One Clef models. */
export declare function createCloudflareProvider(options?: CloudflareOptions): System1Provider;
//# sourceMappingURL=adapter.d.ts.map