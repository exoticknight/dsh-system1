import { System1ProviderError } from '../../contracts/error.js';
import { normalizeSystemOneResponse } from '../systemone.js';
const MODELS = new Map([
    ['clef', { path: '@cf/cloudflare/clef', requestModel: 'clef' }],
    ['@cf/cloudflare/clef', { path: '@cf/cloudflare/clef', requestModel: 'clef' }],
    ['clef-flash', { path: '@cf/cloudflare/clef-flash', requestModel: 'clef-flash' }],
    ['@cf/cloudflare/clef-flash', { path: '@cf/cloudflare/clef-flash', requestModel: 'clef-flash' }],
]);
const CAPABILITIES = {
    primitives: ['noul', 'choice', 'score'],
    maxQuestions: 64,
    context: { maxTokens: 65_536, includesQuestions: true },
};
/** Cloudflare REST transport for the native System One Clef models. */
export function createCloudflareProvider(options = {}) {
    const fetchFn = options.fetch ?? globalThis.fetch;
    return {
        async describe(model) {
            if (!MODELS.has(model))
                throw new System1ProviderError({
                    code: 'unsupported',
                    message: 'Cloudflare model is not supported.',
                });
            return CAPABILITIES;
        },
        async evaluate(request, signal) {
            const selectedModel = MODELS.get(request.model);
            if (!selectedModel)
                throw new System1ProviderError({
                    code: 'unsupported',
                    message: 'Cloudflare model is not supported.',
                });
            let apiKey;
            let accountId;
            try {
                apiKey = await (options.resolveApiKey ?? (() => options.apiKey))();
                accountId = await (options.resolveAccountId ?? (() => options.accountId))();
            }
            catch {
                throw new System1ProviderError({
                    code: 'unavailable',
                    message: 'Cloudflare credentials could not be resolved.',
                });
            }
            if (!apiKey?.trim() || !accountId?.trim())
                throw new System1ProviderError({
                    code: 'unavailable',
                    message: 'Cloudflare API token and account ID are required.',
                });
            const baseURL = options.resolveBaseURL?.() ?? options.baseURL ?? 'https://api.cloudflare.com/client/v4';
            let response;
            try {
                response = await fetchFn(`${trimTrailingSlashes(baseURL)}/accounts/${encodeURIComponent(accountId.trim())}/ai/run/${selectedModel.path}`, {
                    method: 'POST',
                    redirect: 'error',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${apiKey.trim()}`,
                    },
                    body: JSON.stringify({
                        model: selectedModel.requestModel,
                        state: request.state,
                        questions: request.questions,
                    }),
                    signal,
                });
            }
            catch {
                signal.throwIfAborted();
                throw new System1ProviderError({
                    code: 'provider_error',
                    message: 'Cloudflare transport failed.',
                    retryable: true,
                });
            }
            if (!response.ok) {
                await response.body?.cancel();
                throw new System1ProviderError({
                    code: response.status === 401 || response.status === 403
                        ? 'unavailable'
                        : 'provider_error',
                    message: 'Cloudflare request failed.',
                    httpStatus: response.status,
                    retryable: response.status === 429 || response.status >= 500,
                });
            }
            let raw;
            try {
                raw = await response.json();
            }
            catch {
                throw new System1ProviderError({
                    code: 'invalid_response',
                    message: 'Cloudflare returned an invalid response.',
                });
            }
            const result = unwrapCloudflareResult(raw);
            return normalizeSystemOneResponse(request, result, 'Cloudflare');
        },
    };
}
function unwrapCloudflareResult(raw) {
    if (!raw || typeof raw !== 'object' || !('success' in raw))
        return raw;
    const envelope = raw;
    if (envelope.success !== true)
        throw new System1ProviderError({
            code: 'provider_error',
            message: 'Cloudflare request failed.',
        });
    return envelope.result;
}
function trimTrailingSlashes(value) {
    return value.trim().replace(/\/+$/u, '');
}
//# sourceMappingURL=adapter.js.map