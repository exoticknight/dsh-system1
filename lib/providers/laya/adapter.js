import { findProviderModel } from '../models.js';
import { createSystemOneHttpProvider } from '../systemone.js';
import { LAYA_MODELS } from './models.js';
export function createLayaProvider(options) {
    return createSystemOneHttpProvider({
        providerName: 'Laya',
        defaultBaseURL: options.baseURL ?? 'http://127.0.0.1:8000',
        resolveApiKey: options.resolveApiKey ?? (() => options.apiKey),
        ...(options.resolveBaseURL ? { resolveBaseURL: options.resolveBaseURL } : {}),
        apiKeyRequired: false,
        resolveModel: (model) => findProviderModel(LAYA_MODELS, model),
        requestModel: (model) => model === 'auto' ? undefined : model,
        selectResponseModel: (response) => {
            const routing = response.routing;
            if (!routing || typeof routing !== 'object')
                return undefined;
            const model = routing.model;
            return typeof model === 'string' && model.trim() ? model : undefined;
        },
        ...(options.fetch ? { fetch: options.fetch } : {}),
    });
}
//# sourceMappingURL=adapter.js.map