import type { System1Provider } from '../../contracts/index.js';
export interface NaceOptions {
    apiKey: string;
    baseURL?: string;
    resolveApiKey?: () => string | undefined | Promise<string | undefined>;
    resolveBaseURL?: () => string | undefined;
    fetch?: typeof fetch;
    warn?: (message: string) => void;
}
/** Nace Drex adapter: the official SDK owns API and temporary-file transport. */
export declare function createNaceProvider(options: NaceOptions): System1Provider;
//# sourceMappingURL=adapter.d.ts.map