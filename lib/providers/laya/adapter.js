import { createSystemOneHttpProvider } from '../systemone.js';
const MODELS = new Set(['auto', 'english', 'multilingual', 'typed-decisions']);
export function createLayaProvider(options) {
    return createSystemOneHttpProvider({
        providerName: 'Laya',
        defaultBaseURL: options.baseURL ?? 'http://127.0.0.1:8000',
        resolveApiKey: options.resolveApiKey ?? (() => options.apiKey),
        ...(options.resolveBaseURL ? { resolveBaseURL: options.resolveBaseURL } : {}),
        apiKeyRequired: false,
        isModelSupported: (model) => MODELS.has(model),
        requestModel: (model) => model === 'auto' ? undefined : model,
        ...(options.fetch ? { fetch: options.fetch } : {}),
    });
}
//# sourceMappingURL=adapter.js.map