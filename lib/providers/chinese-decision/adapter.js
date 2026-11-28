import { decideOperation } from '../../contracts/decide.js';
import { System1ProviderError } from '../../contracts/error.js';
import { invalidProviderResponse } from '../http.js';
import { findProviderModel } from '../models.js';
import { createSystemOneDecisionImplementation } from '../systemone.js';
const PROVIDER_NAME = 'Chinese Decision';
export const CHINESE_DECISION_DEFAULT_BASE_URL = 'http://127.0.0.1:8787';
export const CHINESE_DECISION_DEFAULT_TIMEOUT_MS = 10_000;
export const CHINESE_DECISION_MODELS = [
    { id: 'chinese-decision-0.8b' },
];
const capabilities = {
    primitives: ['noul', 'choice', 'score'],
    maxQuestions: 64,
    maxChoiceOptions: 26,
    maxScoreLevels: 26,
    // The GGUF server compiles state with one question at a time.
    context: { maxTokens: 16_384, includesQuestions: false, maxStatePlusQuestionTokens: 16_384 },
};
export function createChineseDecisionProvider(options = {}) {
    return createSystemOneDecisionImplementation(CHINESE_DECISION_MODELS, {
        providerName: PROVIDER_NAME,
        defaultBaseURL: options.baseURL ?? CHINESE_DECISION_DEFAULT_BASE_URL,
        timeoutMs: () => options.timeoutMs ?? CHINESE_DECISION_DEFAULT_TIMEOUT_MS,
        resolveApiKey: () => undefined,
        apiKeyRequired: false,
        capabilities,
        resolveModel: (model) => findProviderModel(CHINESE_DECISION_MODELS, model),
        // The local server serves the loaded checkpoint, regardless of the request's model field.
        selectResponseModel: ({ model }) => {
            if (model !== CHINESE_DECISION_MODELS[0].id)
                throw invalidProviderResponse(PROVIDER_NAME);
            return model;
        },
        serializeRequest: (request) => {
            // Direct transport callers do not pass through the operation's capability gate.
            const limitation = decideOperation.checkCapabilities(request, capabilities);
            if (limitation)
                throw new System1ProviderError(limitation, 'fallback', false);
            const { state, questions } = request;
            if (state === null)
                throw unsupported('requires a non-null state.');
            for (const question of Object.values(questions)) {
                if (question.type === 'choice' && Object.keys(question.criteria).length < 2)
                    throw unsupported('requires at least two choice options.');
                if (question.type === 'score' && question.criteria.length < 2)
                    throw unsupported('requires at least two score levels.');
                // Upstream converts structured levels to strings in the returned legend.
                if (question.type === 'score' && question.criteria.some((level) => typeof level !== 'string'))
                    throw unsupported('requires plain-text score levels.');
            }
            return { body: { state, questions } };
        },
        ...(options.fetch ? { fetch: options.fetch } : {}),
    });
}
function unsupported(reason) {
    return new System1ProviderError({
        code: 'unsupported',
        message: `${PROVIDER_NAME} ${reason}`,
    }, 'fallback', false);
}
//# sourceMappingURL=adapter.js.map