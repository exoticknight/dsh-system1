import { randomUUID } from 'node:crypto';
import { decideOperation, decideOutputSchema } from '../contracts/decide.js';
import { System1InputError, System1ProviderError } from '../contracts/error.js';
import { currentDeployment, findFixedModel } from './registry.js';
import { modelChain, OperationRuntime } from './operations.js';
import { execute } from './execution.js';
import { parseRequest, modelSchema, timeoutSchema, capabilitiesSchema, responseSchema, errorSchema, validateAnswer, } from './validation.js';
export class System1Engine {
    operations;
    resolveOptions;
    constructor(options = {}) {
        if (typeof options === 'function') {
            this.resolveOptions = options;
        }
        else {
            this.validateOptions(options);
            const snapshot = structuredClone(options);
            this.resolveOptions = () => snapshot;
        }
        this.operations = new OperationRuntime(this.resolveOptions);
        this.operations.registry.registerOperation(decideOperation);
    }
    validateOptions(options, validateFallbackModels = true) {
        if (options.defaultModel &&
            !modelSchema.safeParse(options.defaultModel).success)
            throw new System1InputError('Invalid default model.');
        if (validateFallbackModels &&
            options.fallbackModels !== undefined &&
            (!Array.isArray(options.fallbackModels) ||
                options.fallbackModels.some((model) => !modelSchema.safeParse(model).success)))
            throw new System1InputError('Invalid fallback models.');
    }
    registerImplementation(operation, id, provider, warn) {
        return this.operations.registry.registerImplementation(operation, id, provider, warn);
    }
    dispose() {
        this.operations.registry.dispose();
    }
    async run(operation, input, options) {
        if (operation !== decideOperation)
            return this.operations.run(operation, input, options);
        // Keep the established per-question answers and routing policy for the built-in decision contract.
        const attempts = [];
        const decision = await this.decide({ ...input, ...options }, attempts);
        const { requestId, requested, executed, durationMs, usage, approximate, degraded } = decision.meta;
        const meta = { requestId, requested, ...(executed ? { executed } : {}), durationMs, attempts };
        if (executed) {
            const value = {
                answers: decision.answers,
                ...(usage ? { usage } : {}),
                ...(approximate !== undefined ? { approximate } : {}),
                ...(degraded !== undefined ? { degraded } : {}),
            };
            return { status: 'ok', value: value, meta };
        }
        const first = Object.values(decision.answers)[0];
        const error = first.status === 'error' ? first.error : {
            code: 'provider_error', message: 'Provider evaluation failed.',
        };
        return {
            status: 'error',
            reason: error.code === 'cancelled' ? 'cancelled'
                : attempts.some(({ kind }) => kind === 'executed') ? 'upstream_execution_failed' : 'no_applicable_model',
            error,
            meta,
        };
    }
    async decide(input, operationAttempts) {
        const start = performance.now();
        const options = structuredClone(this.resolveOptions());
        this.operations.assertOperationEnabled(decideOperation.id, options);
        const req = parseRequest(input);
        this.validateOptions(options, req.model === undefined);
        const chain = req.model ? [{ ...req.model }] : modelChain(options.defaultModel, options.fallbackModels ?? []);
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
        if (req.signal?.aborted || this.operations.registry.disposed)
            return failure({ code: 'cancelled', message: 'Decision cancelled.' });
        const attempts = [];
        const seen = new Set();
        let lastError;
        for (const model of chain) {
            if (req.signal?.aborted || this.operations.registry.disposed) {
                const error = {
                    code: 'cancelled',
                    message: 'Decision cancelled.',
                };
                return failure(error, attempts.length ? { attempts } : {});
            }
            const outcome = await this.attempt(req, model, meta.requestId, seen);
            if (!outcome)
                continue; // An earlier ID already attempted this same fixed model.
            if ('error' in outcome) {
                lastError = outcome.error;
                operationAttempts?.push({
                    ...model,
                    kind: outcome.sent ? 'executed' : 'skipped',
                    error: { code: outcome.error.code, message: outcome.error.message },
                });
                if (outcome.error.code === 'cancelled')
                    return failure(outcome.error, attempts.length ? { attempts } : {});
                attempts.push({
                    ...model,
                    error: { code: outcome.error.code, message: outcome.error.message },
                });
                continue;
            }
            const { result } = outcome;
            operationAttempts?.push({ ...model, kind: 'executed' });
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
    async attempt(req, model, requestId, seen) {
        const entry = this.operations.registry.get(decideOperation)?.implementations.get(model.provider);
        if (!entry)
            return {
                error: {
                    code: 'unavailable',
                    message: 'Requested provider is not registered.',
                },
                sent: false,
            };
        let sent = false;
        let aliasTarget;
        try {
            const timeoutMs = req.timeoutMs ?? entry.provider.timeoutMs();
            if (!timeoutSchema.safeParse(timeoutMs).success)
                return {
                    error: {
                        code: 'invalid_response',
                        message: 'Provider returned an invalid timeout.',
                    },
                    sent: false,
                };
            const result = await execute([entry.controller.signal, ...(req.signal ? [req.signal] : [])], timeoutMs, async (signal) => {
                const deployment = currentDeployment(entry.provider);
                const { models } = deployment;
                const selected = models.kind === 'deployment'
                    ? await models.resolve(model.model, signal)
                    : findFixedModel(models, model.model);
                if (!selected)
                    throw new System1ProviderError({
                        code: 'unsupported',
                        message: (models.kind === 'fixed' && models.unknownModelMessage)
                            || 'Provider model is not supported.',
                    });
                if (entry.provider.resolveDeployment && models.kind === 'fixed' && selected.aliases?.length) {
                    aliasTarget = selected;
                    if (seen.has(aliasTarget))
                        return undefined;
                }
                const described = capabilitiesSchema.safeParse(selected.capabilities);
                if (!described.success) {
                    if (!entry.warnedInvalidCapabilities) {
                        entry.warnedInvalidCapabilities = true;
                        try {
                            entry.warn?.('Provider returned invalid model capabilities; check required attachment and question limits.');
                        }
                        catch {
                            // Diagnostics must not change the result of a provider attempt.
                        }
                    }
                    throw new System1ProviderError({
                        code: 'invalid_response',
                        message: 'Provider returned invalid model capabilities.',
                    });
                }
                const limitation = decideOperation.checkCapabilities(req, described.data);
                if (limitation)
                    throw new System1ProviderError(limitation);
                signal.throwIfAborted();
                sent = true;
                const raw = await deployment.execute(structuredClone({
                    state: req.state,
                    questions: req.questions,
                    ...(req.images ? { images: req.images } : {}),
                    ...(req.audio ? { audio: req.audio } : {}),
                    ...(req.videos ? { videos: req.videos } : {}),
                    ...(req.longContext ? { longContext: true } : {}),
                }), { model: selected.id, signal, requestId });
                signal.throwIfAborted();
                const output = decideOutputSchema.safeParse(raw?.result);
                const parsed = output.success ? responseSchema.safeParse({
                    ...output.data,
                    model: raw.model,
                    ...(raw.revision !== undefined ? { revision: raw.revision } : {}),
                }) : output;
                if (!parsed.success)
                    throw new System1ProviderError({
                        code: 'invalid_response',
                        message: 'Provider returned an invalid response envelope.',
                    });
                return parsed.data;
            });
            return result ? { result } : undefined;
        }
        catch (error) {
            if (error instanceof System1ProviderError && error.requestSent === false)
                sent = false;
            if (sent && aliasTarget)
                seen.add(aliasTarget);
            if (error instanceof System1ProviderError) {
                const detail = errorSchema.safeParse(error.detail);
                if (detail.success)
                    return { error: detail.data, sent };
            }
            return {
                error: {
                    code: 'provider_error',
                    message: 'Provider evaluation failed.',
                },
                sent,
            };
        }
    }
}
//# sourceMappingURL=engine.js.map