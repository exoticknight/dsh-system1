import { createTypesafeDecider } from '@tanstack/ai-typesafe'
import { resolveDebugOption } from '@tanstack/ai/adapter-internals'
import type { EvaluateOptions } from '@tanstack/ai/adapters'
import { z } from 'zod'
import type { ProviderRequest, System1Provider } from '../../contracts/index.js'
import { System1ProviderError } from '../../contracts/error.js'

export interface TypesafeOptions {
  apiKey: string
  baseURL?: string
  fetch?: typeof fetch
}

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
    legend: z.record(z.string(), z.unknown()),
    probabilities: z.record(z.string(), z.number()),
    confidence: z.number().optional(),
  }),
])

function normalize(request: ProviderRequest, answers: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(answers).map(([id, raw]) => {
      const parsed = wireAnswer.safeParse(raw)
      const question = request.questions[id]
      if (!parsed.success || !question || question.type !== parsed.data.type)
        return [
          id,
          {
            status: 'error',
            error: {
              code: 'invalid_response',
              message: 'Invalid TypeSafe answer.',
            },
          },
        ]
      const a = parsed.data
      const confidence =
        'confidence' in a && a.confidence !== undefined
          ? { confidence: a.confidence }
          : {}
      if (a.type === 'noul')
        return [
          id,
          { status: 'ok', answer: { type: 'noul', probabilityTrue: a.noul } },
        ]
      if (a.type === 'choice')
        return [
          id,
          {
            status: 'ok',
            answer: {
              type: 'choice',
              value: a.choice,
              probabilities: a.probabilities,
              ...confidence,
            },
          },
        ]
      if (question.type !== 'score') return [id, undefined]
      const keys = question.criteria.map((_, i) => String(i))
      if (
        Object.keys(a.probabilities).length !== keys.length ||
        Object.keys(a.legend).length !== keys.length ||
        keys.some(
          (k) =>
            !Object.hasOwn(a.probabilities, k) || !Object.hasOwn(a.legend, k),
        )
      )
        return [id, undefined]
      return [
        id,
        {
          status: 'ok',
          answer: {
            type: 'score',
            value: a.score,
            levels: keys.map((key) => a.legend[key]),
            probabilities: keys.map((k) => a.probabilities[k]),
            ...confidence,
          },
        },
      ]
    }),
  )
}

export function createTypesafeProvider(
  options: TypesafeOptions,
): System1Provider {
  const fetchFn = options.fetch ?? globalThis.fetch
  const transport: typeof fetch = async (input, init) => {
    let response: Response
    try {
      response = await fetchFn(input, { ...init, redirect: 'error' })
    } catch {
      throw new System1ProviderError({
        code: 'provider_error',
        message: 'TypeSafe transport failed.',
        retryable: true,
      })
    }
    if (!response.ok) {
      await response.body?.cancel()
      throw new System1ProviderError({
        code:
          response.status === 401 || response.status === 403
            ? 'unavailable'
            : 'provider_error',
        message: 'TypeSafe request failed.',
        httpStatus: response.status,
        retryable: response.status === 429 || response.status >= 500,
      })
    }
    return response
  }
  return {
    async describe(model) {
      if (!['jev-1.13.0', 'jev-latest'].includes(model)) {
        throw new System1ProviderError({
          code: 'unsupported',
          message: 'TypeSafe model capabilities have not been verified.',
        })
      }
      return {
        primitives: ['noul', 'choice', 'score'],
        maxChoiceOptions: 255,
        maxScoreLevels: 10,
        ...(model === 'jev-1.13.0'
          ? {
              context: {
                maxTokens: 64000,
                includesQuestions: true,
                maxStatePlusQuestionTokens: 32000,
              },
            }
          : {}),
      }
    },
    async evaluate(request, signal) {
      if (
        request.state === null ||
        ['number', 'boolean'].includes(typeof request.state)
      ) {
        throw new System1ProviderError({
          code: 'unsupported',
          message: 'TypeSafe state must be a string, object or array.',
        })
      }
      if (!options.apiKey.trim())
        throw new System1ProviderError({
          code: 'unavailable',
          message: 'TypeSafe API key is not configured.',
        })
      const adapter = createTypesafeDecider(request.model, options.apiKey, {
        ...(options.baseURL ? { baseURL: options.baseURL } : {}),
        fetch: transport,
      })
      try {
        // 0.1.1 forwards JSON unchanged, but its wire declarations narrow
        // structured criteria and scalar state more than the HTTP protocol.
        const result = await adapter.evaluate({
          model: request.model,
          state: request.state,
          questions: request.questions,
          abortSignal: signal,
          logger: resolveDebugOption(false),
        } as EvaluateOptions)
        return {
          model: result.model,
          answers: normalize(request, result.answers),
          usage: {
            inputTokens: result.usage.promptTokens,
            outputTokens: result.usage.completionTokens,
          },
        }
      } catch (error) {
        if (error instanceof System1ProviderError) throw error
        throw new System1ProviderError({
          code: 'invalid_response',
          message: 'TypeSafe returned an invalid response.',
        })
      }
    },
  }
}
