import { z } from 'zod';
import { System1ProviderError } from '../contracts/error.js';
const wireAnswer = z.discriminatedUnion('type', [
    z.object({ type: z.literal('noul'), noul: z.number() }),
    z.object({
        type: z.literal('choice'),
        choice: z.string(),
        probabilities: z.record(z.string(), z.number()),
        confidence: z.number().optional(),
    }),
    z.object({
        type: z.literal('score'),
        score: z.number(),
        legend: z.record(z.string(), z.unknown()).optional(),
        probabilities: z.record(z.string(), z.number()),
        confidence: z.number().optional(),
    }),
]);
const wireResponse = z.object({
    model: z.string().optional(),
    answers: z.record(z.string(), z.unknown()),
    usage: z.object({
        input_tokens: z.number().int().nonnegative().optional(),
        output_tokens: z.number().int().nonnegative().optional(),
    }).optional(),
}).passthrough();
/**
 * Shared transport for providers that implement the TypeSafe System One wire
 * contract. Provider identity, URL, key policy and model mapping stay separate.
 */
export function createSystemOneHttpProvider(options) {
    const fetchFn = options.fetch ?? globalThis.fetch;
    return {
        async describe(model) {
            if (!options.isModelSupported(model))
                throw new System1ProviderError({
                    code: 'unsupported',
                    message: `${options.providerName} model is not supported.`,
                });
            return options.capabilities ?? { primitives: ['noul', 'choice', 'score'] };
        },
        async evaluate(request, signal) {
            let apiKey;
            try {
                apiKey = await options.resolveApiKey();
            }
            catch {
                throw new System1ProviderError({
                    code: 'unavailable',
                    message: `${options.providerName} API key could not be resolved.`,
                });
            }
            if (options.apiKeyRequired !== false && !apiKey?.trim())
                throw new System1ProviderError({
                    code: 'unavailable',
                    message: `${options.providerName} API key is not configured.`,
                });
            const baseURL = options.resolveBaseURL?.() ?? options.defaultBaseURL;
            let response;
            try {
                response = await fetchFn(`${trimTrailingSlashes(baseURL)}/v1/systemone`, {
                    method: 'POST',
                    redirect: 'error',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(apiKey?.trim() ? { Authorization: `Bearer ${apiKey.trim()}` } : {}),
                    },
                    body: JSON.stringify({
                        ...(options.requestModel
                            ? modelField(options.requestModel(request.model))
                            : { model: request.model }),
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
                    message: `${options.providerName} transport failed.`,
                    retryable: true,
                });
            }
            if (!response.ok) {
                await response.body?.cancel();
                throw new System1ProviderError({
                    code: response.status === 401 || response.status === 403
                        ? 'unavailable'
                        : 'provider_error',
                    message: `${options.providerName} request failed.`,
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
                    message: `${options.providerName} returned an invalid response.`,
                });
            }
            const parsed = wireResponse.safeParse(raw);
            if (!parsed.success)
                throw new System1ProviderError({
                    code: 'invalid_response',
                    message: `${options.providerName} returned an invalid response.`,
                });
            const answeredModel = parsed.data.model ?? request.model;
            return {
                model: answeredModel || request.model,
                answers: normalizeAnswers(request, parsed.data.answers),
                ...(parsed.data.usage
                    ? {
                        usage: {
                            ...(parsed.data.usage.input_tokens !== undefined
                                ? { inputTokens: parsed.data.usage.input_tokens }
                                : {}),
                            ...(parsed.data.usage.output_tokens !== undefined
                                ? { outputTokens: parsed.data.usage.output_tokens }
                                : {}),
                        },
                    }
                    : {}),
            };
        },
    };
}
function normalizeAnswers(request, answers) {
    return Object.fromEntries(Object.entries(answers).map(([id, raw]) => {
        const parsed = wireAnswer.safeParse(raw);
        const question = request.questions[id];
        if (!parsed.success || !question || question.type !== parsed.data.type)
            return [id, invalidAnswer()];
        const answer = parsed.data;
        if (answer.type === 'noul')
            return [id, { status: 'ok', answer: { type: 'noul', probabilityTrue: answer.noul } }];
        if (answer.type === 'choice')
            return [id, {
                    status: 'ok',
                    answer: {
                        type: 'choice',
                        value: answer.choice,
                        probabilities: answer.probabilities,
                        ...(answer.confidence !== undefined ? { confidence: answer.confidence } : {}),
                    },
                }];
        if (question.type !== 'score')
            return [id, invalidAnswer()];
        const probabilities = question.criteria.map((_, index) => {
            const probability = answer.probabilities[String(index)];
            return probability;
        });
        if (probabilities.some((probability) => probability === undefined))
            return [id, invalidAnswer()];
        return [id, {
                status: 'ok',
                answer: {
                    type: 'score',
                    value: answer.score,
                    levels: question.criteria,
                    probabilities,
                    ...(answer.confidence !== undefined ? { confidence: answer.confidence } : {}),
                },
            }];
    }));
}
function invalidAnswer() {
    return {
        status: 'error',
        error: {
            code: 'invalid_response',
            message: 'Provider returned an invalid answer.',
        },
    };
}
function modelField(model) {
    return model ? { model } : {};
}
function trimTrailingSlashes(value) {
    return value.trim().replace(/\/+$/u, '');
}
//# sourceMappingURL=systemone.js.map