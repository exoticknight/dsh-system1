import { randomUUID } from 'node:crypto';
import { System1InputError, System1ProviderError } from '../contracts/error.js';
import { ProviderRegistry } from './registry.js';
import { execute } from './execution.js';
import { parseRequest, modelSchema, timeoutSchema, capabilitiesSchema, responseSchema, errorSchema, validateAnswer, } from './validation.js';
export class System1Engine {
    registry = new ProviderRegistry();
    resolveOptions;
    constructor(options = {}) {
        if (typeof options === 'function') {
            this.resolveOptions = options;
            return;
        }
        this.validateOptions(options);
        const snapshot = structuredClone(options);
        this.resolveOptions = () => snapshot;
    }
    validateOptions(options, validateFallbackModels = true) {
        if (options.defaultModel &&
            !modelSchema.safeParse(options.defaultModel).success)
            throw new System1InputError('Invalid default model.');
        if (options.timeoutMs !== undefined &&
            !timeoutSchema.safeParse(options.timeoutMs).success)
            throw new System1InputError('Invalid default timeout.');
        if (validateFallbackModels &&
            options.fallbackModels !== undefined &&
            (!Array.isArray(options.fallbackModels) ||
                options.fallbackModels.some((model) => !modelSchema.safeParse(model).success)))
            throw new System1InputError('Invalid fallback models.');
    }
    registerProvider(id, provider) {
        return this.registry.register(id, provider);
    }
    dispose() {
        this.registry.dispose();
    }
    async decide(input) {
        const start = performance.now();
        const req = parseRequest(input);
        const options = structuredClone(this.resolveOptions());
        this.validateOptions(options, req.model === undefined);
        const chain = modelChain(req.model, options);
        if (chain.length === 0)
            throw new System1InputError('Select a model or configure a default model.');
        const requested = chain[0];
        const meta = {
            requestId: randomUUID(),
            requested,
            durationMs: 0,
        };
        const finish = (answers, extra = {}) => ({
            answers: answers,
            meta: { ...meta, ...extra, durationMs: performance.now() - start },
        });
        const failure = (error, extra = {}) => finish(Object.fromEntries(Object.keys(req.questions).map((id) => [
            id,
            { status: 'error', error },
        ])), extra);
        if (req.signal?.aborted)
            return failure({ code: 'cancelled', message: 'Decision cancelled.' });
        const attempts = [];
        let lastError;
        for (const model of chain) {
            if (req.signal?.aborted) {
                const error = {
                    code: 'cancelled',
                    message: 'Decision cancelled.',
                };
                return failure(error, attempts.length ? { attempts } : {});
            }
            const outcome = await this.attempt(req, model, meta.requestId, req.timeoutMs ?? options.timeoutMs ?? 800);
            if ('error' in outcome) {
                lastError = outcome.error;
                if (outcome.error.code === 'cancelled')
                    return failure(outcome.error, attempts.length ? { attempts } : {});
                attempts.push({
                    ...model,
                    error: { code: outcome.error.code, message: outcome.error.message },
                });
                continue;
            }
            const { result } = outcome;
            const answers = Object.fromEntries(Object.entries(req.questions).map(([id, q]) => [
                id,
                validateAnswer(q, Object.hasOwn(result.answers, id) ? result.answers[id] : undefined),
            ]));
            const warnings = Object.keys(result.answers).some((id) => !Object.hasOwn(req.questions, id))
                ? ['unexpected_answer_ids']
                : [];
            return finish(answers, {
                executed: {
                    provider: model.provider,
                    model: result.model,
                    ...(result.revision ? { revision: result.revision } : {}),
                },
                ...(result.usage ? { usage: result.usage } : {}),
                ...(result.approximate !== undefined
                    ? { approximate: result.approximate }
                    : {}),
                ...(result.degraded !== undefined ? { degraded: result.degraded } : {}),
                ...(warnings.length ? { warnings } : {}),
                ...(attempts.length ? { attempts } : {}),
            });
        }
        return failure(lastError ?? {
            code: 'provider_error',
            message: 'Provider evaluation failed.',
        }, attempts.length ? { attempts } : {});
    }
    async attempt(req, model, requestId, timeoutMs) {
        const entry = this.registry.get(model.provider);
        if (!entry)
            return {
                error: {
                    code: 'unavailable',
                    message: 'Requested provider is not registered.',
                },
            };
        try {
            const result = await execute([entry.controller.signal, ...(req.signal ? [req.signal] : [])], timeoutMs, async (signal) => {
                const described = capabilitiesSchema.safeParse(await entry.provider.describe(model.model, signal));
                if (!described.success)
                    throw new System1ProviderError({
                        code: 'invalid_response',
                        message: 'Provider returned invalid model capabilities.',
                    });
                const limitation = checkCapabilities(described.data, req.questions);
                if (limitation)
                    throw new System1ProviderError(limitation);
                signal.throwIfAborted();
                const raw = await entry.provider.evaluate(structuredClone({
                    model: model.model,
                    state: req.state,
                    questions: req.questions,
                    requestId,
                }), signal);
                signal.throwIfAborted();
                const parsed = responseSchema.safeParse(raw);
                if (!parsed.success)
                    throw new System1ProviderError({
                        code: 'invalid_response',
                        message: 'Provider returned an invalid response envelope.',
                    });
                return parsed.data;
            });
            return { result };
        }
        catch (error) {
            if (error instanceof System1ProviderError) {
                const detail = errorSchema.safeParse(error.detail);
                if (detail.success)
                    return { error: detail.data };
            }
            return {
                error: {
                    code: 'provider_error',
                    message: 'Provider evaluation failed.',
                },
            };
        }
    }
}
function modelChain(explicit, options) {
    if (explicit)
        return [{ ...explicit }];
    const candidates = [
        ...(options.defaultModel ? [options.defaultModel] : []),
        ...(options.fallbackModels ?? []),
    ];
    const seen = new Set();
    return candidates.flatMap((candidate) => {
        const key = JSON.stringify([candidate.provider, candidate.model]);
        if (seen.has(key))
            return [];
        seen.add(key);
        return [{ ...candidate }];
    });
}
function checkCapabilities(c, questions) {
    const all = Object.values(questions);
    if (c.maxQuestions !== undefined && all.length > c.maxQuestions)
        return {
            code: 'limit_exceeded',
            message: 'Too many questions for this model.',
        };
    for (const q of all) {
        if (!c.primitives.includes(q.type))
            return {
                code: 'unsupported',
                message: `Model does not support ${q.type}.`,
            };
        if (q.type === 'choice' &&
            c.maxChoiceOptions !== undefined &&
            Object.keys(q.criteria).length > c.maxChoiceOptions)
            return {
                code: 'limit_exceeded',
                message: 'Too many choice options for this model.',
            };
        if (q.type === 'score' &&
            c.maxScoreLevels !== undefined &&
            q.criteria.length > c.maxScoreLevels)
            return {
                code: 'limit_exceeded',
                message: 'Too many score levels for this model.',
            };
    }
}
//# sourceMappingURL=engine.js.map