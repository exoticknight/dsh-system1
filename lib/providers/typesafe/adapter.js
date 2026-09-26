import { createSystemOneHttpProvider } from '../systemone.js';
const MODELS = new Set(['jev-latest', 'jev-preview', 'jev-1.13.0']);
export function createTypesafeProvider(options) {
    return createSystemOneHttpProvider({
        providerName: 'TypeSafe',
        defaultBaseURL: options.baseURL ?? 'https://api.typesafe.ai',
        resolveApiKey: options.resolveApiKey ?? (() => options.apiKey),
        ...(options.resolveBaseURL ? { resolveBaseURL: options.resolveBaseURL } : {}),
        apiKeyRequired: true,
        isModelSupported: (model) => MODELS.has(model),
        capabilities: {
            primitives: ['noul', 'choice', 'score'],
            maxChoiceOptions: 255,
            maxScoreLevels: 10,
            context: {
                maxTokens: 64000,
                includesQuestions: true,
                maxStatePlusQuestionTokens: 32000,
            },
        },
        ...(options.fetch ? { fetch: options.fetch } : {}),
    });
}
//# sourceMappingURL=adapter.js.map