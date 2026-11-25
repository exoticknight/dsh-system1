import { System1ProviderError } from '../contracts/error.js';
export interface JsonProviderConnection {
    readonly providerName: string;
    readonly defaultBaseURL: string;
    readonly resolveApiKey: () => string | undefined | Promise<string | undefined>;
    readonly resolveBaseURL?: () => string | undefined;
    readonly apiKeyRequired?: boolean;
    readonly fetch?: typeof fetch;
}
type SerializedRequest = {
    readonly body: Readonly<Record<string, unknown>>;
    readonly headers?: Readonly<Record<string, string>>;
};
export declare function createJsonPost(options: JsonProviderConnection): (path: string, serialize: () => SerializedRequest, signal: AbortSignal, onHttpError?: (response: Response) => Promise<System1ProviderError>) => Promise<unknown>;
export declare function invalidProviderResponse(providerName: string): System1ProviderError;
export {};
//# sourceMappingURL=http.d.ts.map