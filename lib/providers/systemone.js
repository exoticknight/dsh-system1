import { z } from 'zod';
import { isDeepStrictEqual } from 'node:util';
import { System1ProviderError } from '../contracts/error.js';
import { createJsonPost } from './http.js';
import { choiceAnswer, invalidAnswer, noulAnswer, scoreAnswer } from './answers.js';
import { normalizeRoundedDistributionRecord, normalizeRoundedScore } from './probabilities.js';
import { decisionImplementation } from './decision-implementation.js';
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
    const post = createJsonPost(options);
    return {
        timeoutMs: options.timeoutMs,
        async describe(model, _signal) {
            const selectedModel = options.resolveModel(model);
            if (!selectedModel)
                throw new System1ProviderError({
                    code: 'unsupported',
                    message: `${options.providerName} model is not supported.`,
                });
            return capabilitiesFor(options, selectedModel.id);
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
            const raw = await post('/v1/systemone', () => {
                const serialized = options.serializeRequest?.(canonicalRequest) ?? {
                    body: { state: canonicalRequest.state, questions: canonicalRequest.questions },
                };
                return {
                    ...serialized,
                    body: {
                        ...serialized.body,
                        ...(options.requestModel
                            ? modelField(options.requestModel(canonicalRequest.model))
                            : { model: canonicalRequest.model }),
                    },
                };
            }, signal);
            return normalizeSystemOneResponse(canonicalRequest, raw, options.providerName, options.selectResponseModel, options.roundedProbabilities);
        },
    };
}
export function createSystemOneDecisionImplementation(models, options) {
    return decisionImplementation(models, ({ id }) => capabilitiesFor(options, id), createSystemOneHttpProvider(options), options.providerName);
}
function capabilitiesFor(options, id) {
    return typeof options.capabilities === 'function'
        ? options.capabilities(id)
        : options.capabilities ?? {
            primitives: ['noul', 'choice', 'score'],
            maxQuestions: null,
            maxChoiceOptions: null,
            maxScoreLevels: null,
        };
}
/** Shared response normalization for providers that return the System One payload. */
export function normalizeSystemOneResponse(request, raw, providerName, selectResponseModel, roundedProbabilities = false) {
    const parsed = wireResponse.safeParse(raw);
    if (!parsed.success)
        throw new System1ProviderError({
            code: 'invalid_response',
            message: `${providerName} returned an invalid response.`,
        });
    const answeredModel = selectResponseModel?.(parsed.data) ?? parsed.data.model ?? request.model;
    return {
        model: answeredModel || request.model,
        answers: normalizeAnswers(request, parsed.data.answers, roundedProbabilities),
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
function normalizeAnswers(request, answers, roundedProbabilities) {
    return Object.fromEntries(Object.entries(answers).map(([id, raw]) => {
        const parsed = wireAnswer.safeParse(raw);
        const question = request.questions[id];
        if (!parsed.success || !question || question.type !== parsed.data.type)
            return [id, invalidAnswer()];
        const answer = parsed.data;
        if (answer.type === 'noul')
            return [id, noulAnswer(answer.noul)];
        if (answer.type === 'choice')
            return [id, choiceAnswer(answer.choice, roundedProbabilities ? normalizeRoundedDistributionRecord(answer.probabilities) : answer.probabilities, answer.confidence)];
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
        if (!probabilities.every((probability) => probability !== undefined))
            return [id, invalidAnswer()];
        const score = roundedProbabilities
            ? normalizeRoundedScore(answer.score, probabilities)
            : { value: answer.score, probabilities };
        return [id, scoreAnswer(score.value, question.criteria, score.probabilities, answer.confidence)];
    }));
}
function modelField(model) {
    return model ? { model } : {};
}
//# sourceMappingURL=systemone.js.map