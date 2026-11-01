import { findProviderModel } from '../models.js';
import { createSystemOneHttpProvider } from '../systemone.js';
import { MERAGPT_MODELS } from './models.js';
const DEFAULT_TIMEOUT_MS = 10_000;
/** Hosted meraGPT Decider 1, which speaks the shared System One wire contract. */
export function createMeraGptProvider(options = {}) {
    return createSystemOneHttpProvider({
        providerName: 'meraGPT',
        defaultBaseURL: options.baseURL ?? 'https://meragpt.com',
        timeoutMs: () => options.resolveTimeoutMs?.() ?? options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        resolveApiKey: options.resolveApiKey ?? (() => options.apiKey),
        ...(options.resolveBaseURL ? { resolveBaseURL: options.resolveBaseURL } : {}),
        apiKeyRequired: true,
        resolveModel: (model) => findProviderModel(MERAGPT_MODELS, model),
        requestModel: (model) => model,
        capabilities: {
            primitives: ['noul', 'choice', 'score'],
            maxQuestions: 64,
            maxChoiceOptions: 10,
            maxScoreLevels: 10,
            context: { maxTokens: 4_096, includesQuestions: true },
        },
        ...(options.fetch ? { fetch: options.fetch } : {}),
    });
}
//# sourceMappingURL=adapter.js.map