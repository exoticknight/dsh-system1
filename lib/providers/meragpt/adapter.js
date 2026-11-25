import { findProviderModel } from '../models.js';
import { createSystemOneHttpProvider } from '../systemone.js';
import { MERAGPT_MODELS } from './models.js';
const DEFAULT_TIMEOUT_MS = 10_000;
/** Hosted meraGPT Decider 1.1, which speaks the shared System One wire contract. */
export function createMeraGptProvider(options = {}) {
    return createSystemOneHttpProvider({
        providerName: 'meraGPT',
        defaultBaseURL: options.baseURL ?? 'https://meragpt.com',
        timeoutMs: () => options.resolveTimeoutMs?.() ?? options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        resolveApiKey: options.resolveApiKey ?? (() => options.apiKey),
        ...(options.resolveBaseURL ? { resolveBaseURL: options.resolveBaseURL } : {}),
        apiKeyRequired: true,
        resolveModel: (model) => findProviderModel(MERAGPT_MODELS, model),
        roundedProbabilities: true,
        serializeRequest: ({ state, questions, images }) => ({
            body: {
                state: images?.length
                    ? {
                        state,
                        images: images.map(({ mediaType, data }) => ({
                            type: 'image_url',
                            image_url: { url: `data:${mediaType};base64,${data}` },
                        })),
                    }
                    : state,
                questions,
            },
        }),
        capabilities: {
            primitives: ['noul', 'choice', 'score'],
            maxQuestions: 64,
            maxChoiceOptions: 255,
            maxScoreLevels: 32,
            images: {
                formats: ['image/png', 'image/jpeg', 'image/webp'],
                maxCount: 8,
                maxBytesPerImage: 8_000_000,
                maxTotalBytes: 64_000_000,
            },
            context: {
                maxTokens: 32_768,
                includesQuestions: false,
                maxStatePlusQuestionTokens: 32_768,
            },
        },
        ...(options.fetch ? { fetch: options.fetch } : {}),
    });
}
//# sourceMappingURL=adapter.js.map