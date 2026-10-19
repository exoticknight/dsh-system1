import { z } from 'zod';
import type { ProviderRequest, ProviderResponse, System1Provider } from '../contracts/index.js';
import type { ModelCapabilities, ProviderModel } from '../contracts/provider.js';
declare const wireResponse: z.ZodObject<{
    model: z.ZodOptional<z.ZodString>;
    answers: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    usage: z.ZodOptional<z.ZodObject<{
        input_tokens: z.ZodOptional<z.ZodNumber>;
        output_tokens: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$loose>;
export interface SystemOneHttpProviderOptions {
    readonly providerName: string;
    readonly defaultBaseURL: string;
    readonly resolveApiKey: () => string | undefined | Promise<string | undefined>;
    readonly resolveBaseURL?: () => string | undefined;
    readonly apiKeyRequired?: boolean;
    readonly resolveModel: (model: string) => ProviderModel | undefined;
    readonly requestModel?: (model: string) => string | undefined;
    readonly capabilities?: ModelCapabilities | ((model: string) => ModelCapabilities);
    readonly serializeRequest?: (request: ProviderRequest) => {
        readonly body: Readonly<Record<string, unknown>>;
        readonly headers?: Readonly<Record<string, string>>;
    };
    readonly selectResponseModel?: (response: z.infer<typeof wireResponse>) => string | undefined;
    readonly fetch?: typeof fetch;
}
/**
 * Shared transport for providers that implement the TypeSafe System One wire
 * contract. Provider identity, URL, key policy and model mapping stay separate.
 */
export declare function createSystemOneHttpProvider(options: SystemOneHttpProviderOptions): System1Provider;
/** Shared response normalization for providers that return the System One payload. */
export declare function normalizeSystemOneResponse(request: ProviderRequest, raw: unknown, providerName: string, selectResponseModel?: (response: z.infer<typeof wireResponse>) => string | undefined): ProviderResponse;
export {};
//# sourceMappingURL=systemone.d.ts.map