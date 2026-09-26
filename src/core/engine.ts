import { randomUUID } from 'node:crypto'
import type {
  DecideRequest,
  DecideResponse,
  DecisionMeta,
  System1Options,
} from '../contracts/request.js'
import type { Questions } from '../contracts/question.js'
import type {
  System1Provider,
  ModelCapabilities,
} from '../contracts/provider.js'
import type { QuestionResult } from '../contracts/answer.js'
import type { DecisionError } from '../contracts/error.js'
import { System1InputError, System1ProviderError } from '../contracts/error.js'
import { ProviderRegistry } from './registry.js'
import { execute } from './execution.js'
import {
  parseRequest,
  modelSchema,
  timeoutSchema,
  capabilitiesSchema,
  responseSchema,
  errorSchema,
  validateAnswer,
} from './validation.js'

export class System1Engine {
  private readonly registry = new ProviderRegistry()
  private readonly resolveOptions: () => System1Options
  constructor(options: System1Options | (() => System1Options) = {}) {
    if (typeof options === 'function') {
      this.resolveOptions = options
      return
    }
    this.validateOptions(options)
    const snapshot = structuredClone(options)
    this.resolveOptions = () => snapshot
  }
  private validateOptions(options: System1Options): void {
    if (
      options.defaultModel &&
      !modelSchema.safeParse(options.defaultModel).success
    )
      throw new System1InputError('Invalid default model.')
    if (
      options.timeoutMs !== undefined &&
      !timeoutSchema.safeParse(options.timeoutMs).success
    )
      throw new System1InputError('Invalid default timeout.')
  }
  registerProvider(id: string, provider: System1Provider): () => void {
    return this.registry.register(id, provider)
  }
  dispose(): void {
    this.registry.dispose()
  }

  async decide<const Q extends Questions>(
    input: DecideRequest<Q>,
  ): Promise<DecideResponse<Q>> {
    const start = performance.now()
    const req = parseRequest(input)
    const options = structuredClone(this.resolveOptions())
    this.validateOptions(options)
    const requested = req.model ?? options.defaultModel
    if (!requested)
      throw new System1InputError(
        'Select a model or configure a default model.',
      )
    const meta: DecisionMeta = {
      requestId: randomUUID(),
      requested: { ...requested },
      durationMs: 0,
    }
    const finish = (
      answers: Record<string, QuestionResult>,
      extra: Partial<DecisionMeta> = {},
    ): DecideResponse<Q> => ({
      answers: answers as DecideResponse<Q>['answers'],
      meta: { ...meta, ...extra, durationMs: performance.now() - start },
    })
    const failure = (error: DecisionError) =>
      finish(
        Object.fromEntries(
          Object.keys(req.questions).map((id) => [
            id,
            { status: 'error', error },
          ]),
        ),
      )
    if (req.signal?.aborted)
      return failure({ code: 'cancelled', message: 'Decision cancelled.' })
    const entry = this.registry.get(requested.provider)
    if (!entry)
      return failure({
        code: 'unavailable',
        message: 'Requested provider is not registered.',
      })
    try {
      const result = await execute(
        [entry.controller.signal, ...(req.signal ? [req.signal] : [])],
        req.timeoutMs ?? options.timeoutMs ?? 800,
        async (signal) => {
          const described = capabilitiesSchema.safeParse(
            await entry.provider.describe(requested.model, signal),
          )
          if (!described.success)
            throw new System1ProviderError({
              code: 'invalid_response',
              message: 'Provider returned invalid model capabilities.',
            })
          const limitation = checkCapabilities(described.data, req.questions)
          if (limitation) throw new System1ProviderError(limitation)
          signal.throwIfAborted()
          const raw = await entry.provider.evaluate(
            structuredClone({
              model: requested.model,
              state: req.state,
              questions: req.questions,
              requestId: meta.requestId,
            }),
            signal,
          )
          signal.throwIfAborted()
          const parsed = responseSchema.safeParse(raw)
          if (!parsed.success)
            throw new System1ProviderError({
              code: 'invalid_response',
              message: 'Provider returned an invalid response envelope.',
            })
          return parsed.data
        },
      )
      const answers = Object.fromEntries(
        Object.entries(req.questions).map(([id, q]) => [
          id,
          validateAnswer(
            q,
            Object.hasOwn(result.answers, id) ? result.answers[id] : undefined,
          ),
        ]),
      )
      const warnings = Object.keys(result.answers).some(
        (id) => !Object.hasOwn(req.questions, id),
      )
        ? ['unexpected_answer_ids']
        : []
      return finish(answers, {
        executed: {
          provider: requested.provider,
          model: result.model,
          ...(result.revision ? { revision: result.revision } : {}),
        },
        ...(result.usage ? { usage: result.usage } : {}),
        ...(result.approximate !== undefined
          ? { approximate: result.approximate }
          : {}),
        ...(result.degraded !== undefined ? { degraded: result.degraded } : {}),
        ...(warnings.length ? { warnings } : {}),
      })
    } catch (error) {
      if (error instanceof System1ProviderError) {
        const detail = errorSchema.safeParse(error.detail)
        if (detail.success) return failure(detail.data)
      }
      return failure({
        code: 'provider_error',
        message: 'Provider evaluation failed.',
      })
    }
  }
}

function checkCapabilities(
  c: ModelCapabilities,
  questions: Questions,
): DecisionError | undefined {
  const all = Object.values(questions)
  if (c.maxQuestions !== undefined && all.length > c.maxQuestions)
    return {
      code: 'limit_exceeded',
      message: 'Too many questions for this model.',
    }
  for (const q of all) {
    if (!c.primitives.includes(q.type))
      return {
        code: 'unsupported',
        message: `Model does not support ${q.type}.`,
      }
    if (
      q.type === 'choice' &&
      c.maxChoiceOptions !== undefined &&
      Object.keys(q.criteria).length > c.maxChoiceOptions
    )
      return {
        code: 'limit_exceeded',
        message: 'Too many choice options for this model.',
      }
    if (
      q.type === 'score' &&
      c.maxScoreLevels !== undefined &&
      q.criteria.length > c.maxScoreLevels
    )
      return {
        code: 'limit_exceeded',
        message: 'Too many score levels for this model.',
      }
  }
}
