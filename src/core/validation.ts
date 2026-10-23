import { isDeepStrictEqual } from 'node:util'
import { z } from 'zod'
import type { Question } from '../contracts/question.js'
import type { QuestionResult } from '../contracts/answer.js'
import { System1InputError } from '../contracts/error.js'

const json = z.json()
const description = z.union([
  z.string(),
  z.record(z.string(), json),
  z.array(json),
])
const imageData = z
  .string()
  .min(4)
  .max(22_369_624)
  .regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u)
const imageInput = z.strictObject({
  mediaType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
  data: imageData,
})
const id = z
  .string()
  .min(1)
  .refine(
    (key) => !['__proto__', 'prototype', 'constructor'].includes(key),
    'Reserved identifier',
  )
const question = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('noul'),
    instructions: description,
    criteria: z
      .strictObject({
        true: description.optional(),
        false: description.optional(),
      })
      .optional(),
  }),
  z.strictObject({
    type: z.literal('choice'),
    instructions: description,
    criteria: z
      .record(id, description.nullable())
      .refine((v) => Object.keys(v).length > 0),
  }),
  z.strictObject({
    type: z.literal('score'),
    instructions: description,
    criteria: z.array(description).min(2),
  }),
  z.strictObject({
    type: z.literal('box'),
    instructions: description,
  }),
])
export const modelSchema = z.strictObject({
  provider: id,
  model: z.string().min(1),
})
export const timeoutSchema = z.number().int().positive().max(2_147_483_647)
const requestSchema = z.strictObject({
  state: json,
  questions: z.record(id, question).refine((v) => Object.keys(v).length > 0),
  images: z.array(imageInput).max(8).optional(),
  longContext: z.boolean().optional(),
  model: modelSchema.optional(),
  timeoutMs: timeoutSchema.optional(),
  signal: z.instanceof(AbortSignal).optional(),
}).superRefine((request, context) => {
  if (
    Object.values(request.questions).some((q) => q.type === 'box') &&
    !request.images?.length
  )
    context.addIssue({
      code: 'custom',
      path: ['images'],
      message: 'Box questions require at least one image.',
    })
})
export function parseRequest(input: unknown) {
  try {
    const parsed = requestSchema.safeParse(input)
    if (!parsed.success)
      throw new System1InputError(
        'Invalid decision request: check JSON state, question shapes, model and timeout.',
      )
    return parsed.data
  } catch (error) {
    if (error instanceof System1InputError) throw error
    throw new System1InputError(
      'Decision input must be finite JSON data without cycles.',
    )
  }
}
const probability = z.number().min(0).max(1)
const distribution = z
  .array(probability)
  .min(1)
  .refine((p) => Math.abs(p.reduce((s, v) => s + v, 0) - 1) <= 1e-5)
const answerSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('noul'), probabilityTrue: probability }),
  z.strictObject({
    type: z.literal('choice'),
    value: z.string(),
    probabilities: z.record(id, probability),
    confidence: probability.optional(),
  }),
  z.strictObject({
    type: z.literal('score'),
    value: z.number(),
    levels: z.array(description),
    probabilities: distribution,
    confidence: probability.optional(),
  }),
  z.strictObject({
    type: z.literal('box'),
    box: z.strictObject({
      top: probability,
      bottom: probability,
      left: probability,
      right: probability,
    }).refine((box) => box.top < box.bottom && box.left < box.right),
    confidence: probability.optional(),
  }),
])
export const errorSchema = z.strictObject({
  code: z.enum([
    'unavailable',
    'unsupported',
    'limit_exceeded',
    'timeout',
    'cancelled',
    'provider_error',
    'invalid_response',
  ]),
  message: z.string(),
  retryable: z.boolean().optional(),
  httpStatus: z.number().int().min(100).max(599).optional(),
})
const resultSchema = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal('ok'), answer: answerSchema }),
  z.strictObject({ status: z.literal('error'), error: errorSchema }),
])
export const responseSchema = z.strictObject({
  model: z.string().min(1),
  revision: z.string().min(1).optional(),
  answers: z.record(z.string(), z.unknown()),
  usage: z
    .strictObject({
      inputTokens: z.number().int().nonnegative().optional(),
      outputTokens: z.number().int().nonnegative().optional(),
    })
    .optional(),
  approximate: z.boolean().optional(),
  degraded: z.boolean().optional(),
})
export const capabilitiesSchema = z.strictObject({
  primitives: z.array(z.enum(['noul', 'choice', 'score', 'box'])).min(1),
  maxQuestions: z.number().int().positive().optional(),
  maxChoiceOptions: z.number().int().positive().optional(),
  maxScoreLevels: z.number().int().min(2).optional(),
  images: z.strictObject({
    formats: z.array(z.enum(['image/png', 'image/jpeg', 'image/webp'])).min(1),
    maxCount: z.number().int().positive().optional(),
    maxBytesPerImage: z.number().int().positive().optional(),
    maxTotalBytes: z.number().int().positive().optional(),
  }).optional(),
  longContext: z.strictObject({ maxTokens: z.number().int().positive() }).optional(),
  context: z
    .strictObject({
      maxTokens: z.number().int().positive(),
      includesQuestions: z.boolean(),
      maxStatePlusQuestionTokens: z.number().int().positive().optional(),
    })
    .optional(),
})
export function validateAnswer(q: Question, value: unknown): QuestionResult {
  const invalid = (): QuestionResult => ({
    status: 'error',
    error: {
      code: 'invalid_response',
      message: 'Missing or invalid answer for the requested question.',
    },
  })
  const parsed = resultSchema.safeParse(value)
  if (!parsed.success) return invalid()
  const result = parsed.data
  if (result.status === 'error') return result
  const a = result.answer
  if (a.type !== q.type) return invalid()
  if (a.type === 'choice' && q.type === 'choice') {
    const expected = Object.keys(q.criteria).sort(),
      actual = Object.keys(a.probabilities).sort()
    if (
      !isDeepStrictEqual(expected, actual) ||
      !Object.hasOwn(a.probabilities, a.value) ||
      !distribution.safeParse(Object.values(a.probabilities)).success
    )
      return invalid()
  }
  if (a.type === 'score' && q.type === 'score') {
    if (
      !isDeepStrictEqual(a.levels, q.criteria) ||
      a.probabilities.length !== q.criteria.length ||
      a.value < 0 ||
      a.value > q.criteria.length - 1
    )
      return invalid()
    const expected = a.probabilities.reduce((s, p, i) => s + p * i, 0)
    if (Math.abs(a.value - expected) > 0.011) return invalid()
  }
  return result
}
