import { z } from 'zod';
import { isDeepStrictEqual } from 'node:util';
import { System1ProviderError } from '../contracts/error.js';
import { choiceAnswer, invalidAnswer, noulAnswer, scoreAnswer } from './answers.js';
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
        legend: z.union([z.array(z.unknown()), z.record(z.string(), z.unknown())]).optional(),
        probabilities: z.record(z.string(), z.number()),
        confidence: z.number().optional(),
    }),
    z.object({
        type: z.literal('box'),
        box: z.object({
            top: z.number(),
            bottom: z.number(),
            left: z.number(),
            right: z.number(),
        }),
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
        timeoutMs: options.timeoutMs,
        async describe(model) {
            const selectedModel = options.resolveModel(model);
            if (!selectedModel)
                throw new System1ProviderError({
                    code: 'unsupported',
                    message: `${options.providerName} model is not supported.`,
                });
            return typeof options.capabilities === 'function'
                ? options.capabilities(selectedModel.id)
                : options.capabilities ?? {
                    primitives: ['noul', 'choice', 'score'],
                    maxQuestions: null,
                    maxChoiceOptions: null,
                    maxScoreLevels: null,
                };
        },
        async evaluate(request, signal) {
            const selectedModel = options.resolveModel(request.model);
            if (!selectedModel)
                throw new System1ProviderError({
                    code: 'unsupported',
                    message: `${options.providerName} model is not supported.`,
                });
            const canonicalRequest = request.model === selectedModel.id
                ? request
                : { ...request, model: selectedModel.id };
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
            const serialized = options.serializeRequest?.(canonicalRequest) ?? {
                body: { state: canonicalRequest.state, questions: canonicalRequest.questions },
            };
            let response;
            try {
                response = await fetchFn(`${trimTrailingSlashes(baseURL)}/v1/systemone`, {
                    method: 'POST',
                    redirect: 'error',
                    headers: {
                        'Content-Type': 'application/json',
                        ...serialized.headers,
                        ...(apiKey?.trim() ? { Authorization: `Bearer ${apiKey.trim()}` } : {}),
                    },
                    body: JSON.stringify({
                        ...serialized.body,
                        ...(options.requestModel
                            ? modelField(options.requestModel(canonicalRequest.model))
                            : { model: canonicalRequest.model }),
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
            return normalizeSystemOneResponse(canonicalRequest, raw, options.providerName, options.selectResponseModel);
        },
    };
}
/** Shared response normalization for providers that return the System One payload. */
export function normalizeSystemOneResponse(request, raw, providerName, selectResponseModel) {
    const parsed = wireResponse.safeParse(raw);
    if (!parsed.success)
        throw new System1ProviderError({
            code: 'invalid_response',
            message: `${providerName} returned an invalid response.`,
        });
    const answeredModel = selectResponseModel?.(parsed.data) ?? parsed.data.model ?? request.model;
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
}
function normalizeAnswers(request, answers) {
    return Object.fromEntries(Object.entries(answers).map(([id, raw]) => {
        const parsed = wireAnswer.safeParse(raw);
        const question = request.questions[id];
        if (!parsed.success || !question || question.type !== parsed.data.type)
            return [id, invalidAnswer()];
        const answer = parsed.data;
        if (answer.type === 'noul')
            return [id, noulAnswer(answer.noul)];
        if (answer.type === 'choice')
            return [id, choiceAnswer(answer.choice, answer.probabilities, answer.confidence)];
        if (answer.type === 'box')
            return [id, {
                    status: 'ok',
                    answer: {
                        type: 'box',
                        box: answer.box,
                        ...(answer.confidence !== undefined
                            ? { confidence: answer.confidence }
                            : {}),
                    },
                }];
        if (question.type !== 'score')
            return [id, invalidAnswer()];
        if (answer.legend !== undefined &&
            (!answer.legend || Array.isArray(answer.legend) ||
                !isDeepStrictEqual(answer.legend, Object.fromEntries(question.criteria.map((value, index) => [String(index), value])))))
            return [id, invalidAnswer()];
        const probabilities = question.criteria.map((_, index) => {
            const probability = answer.probabilities[String(index)];
            return probability;
        });
        if (probabilities.some((probability) => probability === undefined))
            return [id, invalidAnswer()];
        return [id, scoreAnswer(answer.score, question.criteria, probabilities, answer.confidence)];
    }));
}
function modelField(model) {
    return model ? { model } : {};
}
function trimTrailingSlashes(value) {
    return value.trim().replace(/\/+$/u, '');
}
//# sourceMappingURL=systemone.js.map