import { z } from 'zod'
import { isDeepStrictEqual } from 'node:util'
import type { ProviderRequest, ProviderResponse, System1Provider } from '../contracts/index.js'
import type { ModelCapabilities, ProviderModel } from '../contracts/provider.js'
import { System1ProviderError } from '../contracts/error.js'

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
])

const wireResponse = z.object({
  model: z.string().optional(),
  answers: z.record(z.string(), z.unknown()),
  usage: z.object({
    input_tokens: z.number().int().nonnegative().optional(),
    output_tokens: z.number().int().nonnegative().optional(),
  }).optional(),
}).passthrough()

export interface SystemOneHttpProviderOptions {
  readonly providerName: string
  readonly defaultBaseURL: string
  readonly resolveApiKey: () => string | undefined | Promise<string | undefined>
  readonly resolveBaseURL?: () => string | undefined
  readonly apiKeyRequired?: boolean
  readonly resolveModel: (model: string) => ProviderModel | undefined
  readonly requestModel?: (model: string) => string | undefined
  readonly capabilities?:
    | ModelCapabilities
    | ((model: string) => ModelCapabilities)
  readonly serializeRequest?: (request: ProviderRequest) => {
    readonly body: Readonly<Record<string, unknown>>
    readonly headers?: Readonly<Record<string, string>>
  }
  readonly selectResponseModel?: (
    response: z.infer<typeof wireResponse>,
  ) => string | undefined
  readonly fetch?: typeof fetch
}

/**
 * Shared transport for providers that implement the TypeSafe System One wire
 * contract. Provider identity, URL, key policy and model mapping stay separate.
 */
export function createSystemOneHttpProvider(
  options: SystemOneHttpProviderOptions,
): System1Provider {
  const fetchFn = options.fetch ?? globalThis.fetch
  return {
    async describe(model) {
      const selectedModel = options.resolveModel(model)
      if (!selectedModel)
        throw new System1ProviderError({
          code: 'unsupported',
          message: `${options.providerName} model is not supported.`,
        })
      return typeof options.capabilities === 'function'
        ? options.capabilities(selectedModel.id)
        : options.capabilities ?? { primitives: ['noul', 'choice', 'score'] }
    },
    async evaluate(request, signal) {
      const selectedModel = options.resolveModel(request.model)
      if (!selectedModel)
        throw new System1ProviderError({
          code: 'unsupported',
          message: `${options.providerName} model is not supported.`,
        })
      const canonicalRequest =
        request.model === selectedModel.id
          ? request
          : { ...request, model: selectedModel.id }

      let apiKey: string | undefined
      try {
        apiKey = await options.resolveApiKey()
      } catch {
        throw new System1ProviderError({
          code: 'unavailable',
          message: `${options.providerName} API key could not be resolved.`,
        })
      }
      if (options.apiKeyRequired !== false && !apiKey?.trim())
        throw new System1ProviderError({
          code: 'unavailable',
          message: `${options.providerName} API key is not configured.`,
        })

      const baseURL = options.resolveBaseURL?.() ?? options.defaultBaseURL
      const serialized = options.serializeRequest?.(canonicalRequest) ?? {
        body: { state: canonicalRequest.state, questions: canonicalRequest.questions },
      }
      let response: Response
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
        })
      } catch {
        signal.throwIfAborted()
        throw new System1ProviderError({
          code: 'provider_error',
          message: `${options.providerName} transport failed.`,
          retryable: true,
        })
      }

      if (!response.ok) {
        await response.body?.cancel()
        throw new System1ProviderError({
          code: response.status === 401 || response.status === 403
            ? 'unavailable'
            : 'provider_error',
          message: `${options.providerName} request failed.`,
          httpStatus: response.status,
          retryable: response.status === 429 || response.status >= 500,
        })
      }

      let raw: unknown
      try {
        raw = await response.json()
      } catch {
        throw new System1ProviderError({
          code: 'invalid_response',
          message: `${options.providerName} returned an invalid response.`,
        })
      }
      return normalizeSystemOneResponse(
        canonicalRequest,
        raw,
        options.providerName,
        options.selectResponseModel,
      )
    },
  }
}

/** Shared response normalization for providers that return the System One payload. */
export function normalizeSystemOneResponse(
  request: ProviderRequest,
  raw: unknown,
  providerName: string,
  selectResponseModel?: (
    response: z.infer<typeof wireResponse>,
  ) => string | undefined,
  options: { probabilityRoundingDigits?: number } = {},
): ProviderResponse {
  const parsed = wireResponse.safeParse(raw)
  if (!parsed.success)
    throw new System1ProviderError({
      code: 'invalid_response',
      message: `${providerName} returned an invalid response.`,
    })

  const answeredModel =
    selectResponseModel?.(parsed.data) ?? parsed.data.model ?? request.model
  return {
    model: answeredModel || request.model,
    answers: normalizeAnswers(
      request,
      parsed.data.answers,
      options.probabilityRoundingDigits,
    ),
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
  }
}

function normalizeAnswers(
  request: ProviderRequest,
  answers: Record<string, unknown>,
  probabilityRoundingDigits?: number,
) {
  return Object.fromEntries(
    Object.entries(answers).map(([id, raw]) => {
      const parsed = wireAnswer.safeParse(raw)
      const question = request.questions[id]
      if (!parsed.success || !question || question.type !== parsed.data.type)
        return [id, invalidAnswer()]

      const answer = parsed.data
      if (answer.type === 'noul')
        return [id, { status: 'ok', answer: { type: 'noul', probabilityTrue: answer.noul } }]
      if (answer.type === 'choice')
        return [id, {
          status: 'ok',
          answer: {
            type: 'choice',
            value: answer.choice,
            probabilities: normalizeRoundedDistributionRecord(
              answer.probabilities,
              probabilityRoundingDigits,
            ),
            ...(answer.confidence !== undefined ? { confidence: answer.confidence } : {}),
          },
        }]
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
        }]

      if (question.type !== 'score') return [id, invalidAnswer()]
      if (answer.legend !== undefined) {
        const normalizedLegend = Array.isArray(answer.legend)
          ? Object.fromEntries(
              answer.legend.map((value, index) => [String(index), value]),
            )
          : answer.legend
        const expectedLegend = Object.fromEntries(
          question.criteria.map((value, index) => [String(index), value]),
        )
        const expectedTextLegend = Object.fromEntries(
          question.criteria.map((value, index) => [
            String(index),
            stringifyDescription(value),
          ]),
        )
        if (
          !isDeepStrictEqual(normalizedLegend, expectedLegend) &&
          !isDeepStrictEqual(normalizedLegend, expectedTextLegend)
        )
          return [id, invalidAnswer()]
      }
      const probabilities = question.criteria.map((_, index) => {
        const probability = answer.probabilities[String(index)]
        return probability
      })
      if (probabilities.some((probability) => probability === undefined))
        return [id, invalidAnswer()]
      const normalizedProbabilities = normalizeRoundedDistribution(
        probabilities as number[],
        probabilityRoundingDigits,
      )
      return [id, {
        status: 'ok',
        answer: {
          type: 'score',
          value: answer.score,
          levels: question.criteria,
          probabilities: normalizedProbabilities,
          ...(answer.confidence !== undefined ? { confidence: answer.confidence } : {}),
        },
      }]
    }),
  )
}

function normalizeRoundedDistributionRecord(
  probabilities: Record<string, number>,
  roundingDigits?: number,
): Record<string, number> {
  if (roundingDigits === undefined) return probabilities
  const keys = Object.keys(probabilities)
  const values = normalizeRoundedDistribution(
    keys.map((key) => probabilities[key]!),
    roundingDigits,
  )
  return Object.fromEntries(keys.map((key, index) => [key, values[index]!]))
}

function normalizeRoundedDistribution(
  probabilities: readonly number[],
  roundingDigits?: number,
): readonly number[] {
  if (roundingDigits === undefined || probabilities.length === 0) return probabilities
  if (
    !Number.isInteger(roundingDigits) ||
    roundingDigits < 0 ||
    probabilities.some((value) => !Number.isFinite(value) || value < 0 || value > 1)
  )
    return probabilities

  const total = probabilities.reduce((sum, value) => sum + value, 0)
  if (!(total > 0) || total === 1) return probabilities

  // Drex can return probabilities rounded to four decimal places. The sum may
  // therefore differ from one by at most half a unit per entry.
  const roundingBound = probabilities.length * 0.5 * 10 ** -roundingDigits
  if (Math.abs(total - 1) > roundingBound + Number.EPSILON * probabilities.length)
    return probabilities
  return probabilities.map((value) => value / total)
}

function invalidAnswer() {
  return {
    status: 'error',
    error: {
      code: 'invalid_response',
      message: 'Provider returned an invalid answer.',
    },
  }
}

/** Nace accepts only text descriptions; JSON descriptions retain their structure as compact text. */
export function stringifyDescription(value: string | object | readonly unknown[]): string {
  if (typeof value === 'string') return value
  return JSON.stringify(value)!
}

function modelField(model: string | undefined): { model?: string } {
  return model ? { model } : {}
}

function trimTrailingSlashes(value: string): string {
  return value.trim().replace(/\/+$/u, '')
}
