import type { System1Provider } from '../contracts/index.js';
import type { ModelCapabilities } from '../contracts/provider.js';
export interface SystemOneHttpProviderOptions {
    readonly providerName: string;
    readonly defaultBaseURL: string;
    readonly resolveApiKey: () => string | undefined | Promise<string | undefined>;
    readonly resolveBaseURL?: () => string | undefined;
    readonly apiKeyRequired?: boolean;
    readonly isModelSupported: (model: string) => boolean;
    readonly requestModel?: (model: string) => string | undefined;
    readonly capabilities?: ModelCapabilities;
    readonly fetch?: typeof fetch;
}
/**
 * Shared transport for providers that implement the TypeSafe System One wire
 * contract. Provider identity, URL, key policy and model mapping stay separate.
 */
export declare function createSystemOneHttpProvider(options: SystemOneHttpProviderOptions): System1Provider;
//# sourceMappingURL=systemone.d.ts.map