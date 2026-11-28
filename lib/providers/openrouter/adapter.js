import { z } from 'zod';
import { decideOperation } from '../../contracts/decide.js';
import { System1ProviderError } from '../../contracts/error.js';
import { validateAnswer } from '../../core/validation.js';
import { decisionImplementation } from '../decision-implementation.js';
import { createJsonPost } from '../http.js';
import { normalizeSystemOneResponse } from '../systemone.js';
import { OPENROUTER_EXECUTED_MODEL, OPENROUTER_FREE_MODEL, OPENROUTER_MODELS } from './models.js';
const capabilities = {
    primitives: ['noul', 'choice', 'score'],
    maxQuestions: null,
    maxChoiceOptions: 255,
    maxScoreLevels: null,
};
const freeRoute = {
    only: ['perplexity'],
    allow_fallbacks: false,
    max_price: { prompt: '0', completion: '0', request: '0' },
};
const wireRoute = z.object({
    model: z.literal(OPENROUTER_EXECUTED_MODEL),
    provider: z.literal('Perplexity'),
    usage: z.object({ cost: z.literal(0), is_byok: z.literal(false) }),
    answers: z.record(z.string(), z.unknown()),
});
const wireAnswer = z.object({ type: z.string(), probabilities: z.record(z.string(), z.number()).optional() });
/** The opt-in, text-only Decider free route on OpenRouter's alpha Decisions API. */
export function createOpenRouterProvider(options = {}) {
    const post = createJsonPost({
        providerName: 'OpenRouter',
        defaultBaseURL: 'https://openrouter.ai',
        resolveApiKey: options.resolveApiKey ?? (() => options.apiKey),
        ...(options.fetch ? { fetch: options.fetch } : {}),
    });
    return decisionImplementation(OPENROUTER_MODELS, () => capabilities, {
        timeoutMs: () => options.resolveTimeoutMs?.() ?? options.timeoutMs ?? 10_000,
        async describe(model) {
            requireFreeModel(model);
            return capabilities;
        },
        async evaluate(request, signal) {
            requireFreeModel(request.model);
            const unsupported = decideOperation.checkCapabilities(request, capabilities);
            if (unsupported)
                throw new System1ProviderError(unsupported, 'stop', false);
            const raw = await post('/api/alpha/decisions', () => ({
                body: {
                    model: OPENROUTER_FREE_MODEL,
                    provider: freeRoute,
                    // The alpha route interprets top-level arrays as possible media parts.
                    state: typeof request.state === 'string' ? request.state : JSON.stringify(request.state),
                    questions: request.questions,
                },
            }), signal);
            const route = wireRoute.safeParse(raw);
            if (!route.success)
                throw new System1ProviderError({
                    code: 'invalid_response',
                    message: 'OpenRouter did not confirm the pinned Perplexity route and zero cost without BYOK.',
                });
            const result = normalizeSystemOneResponse(request, raw, 'OpenRouter');
            const answers = Object.fromEntries(Object.entries(request.questions).map(([id, question]) => {
                const answer = wireAnswer.safeParse(route.data.answers[id]);
                if (answer.success && answer.data.type === 'refusal')
                    return [id, {
                            status: 'error',
                            error: { code: 'provider_error', message: 'OpenRouter refused to answer this question.' },
                        }];
                if (answer.success && answer.data.type === question.type &&
                    (question.type === 'choice' || question.type === 'score')) {
                    const keys = question.type === 'choice'
                        ? Object.keys(question.criteria)
                        : question.criteria.map((_, index) => String(index));
                    const probabilities = answer.data.probabilities;
                    if (!probabilities || Object.keys(probabilities).length !== keys.length ||
                        keys.some((key) => !Object.hasOwn(probabilities, key)))
                        return [id, {
                                status: 'error',
                                error: { code: 'invalid_response', message: 'OpenRouter returned an incomplete probability distribution.' },
                            }];
                }
                return [id, validateAnswer(question, result.answers[id])];
            }));
            return { ...result, answers };
        },
    }, 'OpenRouter');
}
function requireFreeModel(model) {
    if (model !== OPENROUTER_FREE_MODEL)
        throw new System1ProviderError({
            code: 'unsupported',
            message: 'OpenRouter model is not supported.',
        }, 'stop', false);
}
//# sourceMappingURL=adapter.js.map