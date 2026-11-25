import { z } from 'zod'
import { decodedBase64Length, imageInputSchema, MAX_ATTACHMENT_BYTES } from '../core/validation.js'
import type { DecisionError } from './error.js'
import { defineOperation } from './operation.js'
import type { OperationMeta, OperationResult } from './operation.js'
import type { ImageInput } from './request.js'

export interface TextLocateSource {
  readonly type: 'text'
  readonly text: string
}

export interface ImageLocateSource {
  readonly type: 'image'
  readonly image: ImageInput
}

export type LocateSource = TextLocateSource | ImageLocateSource
export interface LocateInput<S extends LocateSource = LocateSource> {
  readonly source: S
  readonly instructions: string
}

interface MatchQuality {
  /** Backend-defined match strength, such as Nace's score. */
  readonly matchScore?: number | undefined
  /** Estimated presence of this match, such as Liquid's found probability. */
  readonly presenceProbability?: number | undefined
}

export interface TextLocateMatch extends MatchQuality {
  readonly text: string
  /** Zero-based Unicode code point index, inclusive. */
  readonly start: number
  /** Zero-based Unicode code point index, exclusive. */
  readonly end: number
}

export interface ImageLocateMatch extends MatchQuality {
  readonly top: number
  readonly bottom: number
  readonly left: number
  readonly right: number
  /** Backend confidence in the geometry of this match. */
  readonly locationConfidence?: number | undefined
}

export type LocateMatch<S extends LocateSource = LocateSource> =
  S extends TextLocateSource ? TextLocateMatch : ImageLocateMatch

export interface LocateOutput {
  readonly matches: readonly TextLocateMatch[] | readonly ImageLocateMatch[]
  /** When true, the provider indicated there may be additional matches. */
  readonly mayHaveMore?: boolean | undefined
}

export type LocateResult<S extends LocateSource = LocateSource> =
  | {
      readonly status: 'ok'
      readonly matches: readonly LocateMatch<S>[]
      readonly mayHaveMore?: boolean | undefined
      readonly meta: OperationMeta
    }
  | Extract<OperationResult<LocateOutput>, { status: 'error' }>

export interface LocateCapabilities {
  /** Check provider limits without sending the source over the network. */
  readonly checkInput?: (input: LocateInput) => DecisionError | undefined
}

const inputSchema = z.strictObject({
  instructions: z.string().refine((value) => value.trim().length > 0),
  source: z.discriminatedUnion('type', [
    z.strictObject({ type: z.literal('text'), text: z.string().min(1) }),
    z.strictObject({
      type: z.literal('image'),
      image: imageInputSchema.refine(({ data }) => decodedBase64Length(data) <= MAX_ATTACHMENT_BYTES),
    }),
  ]),
})

const fraction = z.number().min(0).max(1)
const quality = {
  matchScore: fraction.optional(),
  presenceProbability: fraction.optional(),
}
const textOutput = z.strictObject({
  matches: z.array(z.strictObject({
    text: z.string().min(1),
    start: z.number().int().nonnegative(),
    end: z.number().int().positive(),
    ...quality,
  })),
  mayHaveMore: z.boolean().optional(),
})
const imageOutput = z.strictObject({
  matches: z.array(z.strictObject({
    left: fraction,
    right: fraction,
    top: fraction,
    bottom: fraction,
    locationConfidence: fraction.optional(),
    ...quality,
  }).refine((box) => box.left <= box.right && box.top <= box.bottom)),
  mayHaveMore: z.boolean().optional(),
})

function utf16Boundaries(text: string): readonly number[] {
  const result = [0]
  let offset = 0
  for (const point of text) {
    offset += point.length
    result.push(offset)
  }
  return result
}

/** Translate a half-open code point range for JavaScript slice or DOM APIs. */
export function toUtf16Range(text: string, start: number, end: number): readonly [start: number, end: number] {
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start)
    throw new RangeError('Invalid Unicode code point range.')
  const offsets = utf16Boundaries(text)
  const from = offsets[start], to = offsets[end]
  if (from === undefined || to === undefined)
    throw new RangeError('Unicode code point range exceeds the text.')
  return [from, to]
}

export function toLocateResult<S extends LocateSource>(
  result: OperationResult<LocateOutput>,
): LocateResult<S> {
  if (result.status === 'error') return result
  // The operation checks the match shape against the same input used by the caller.
  return { status: 'ok', ...result.value, meta: result.meta } as LocateResult<S>
}

export const locateOperation = defineOperation<LocateInput, LocateOutput, LocateCapabilities>({
  id: 'locate',
  version: 1,
  title: 'Locate',
  description: 'Find matching passages in text or regions in one image.',
  translations: { 'zh-CN': { title: '定位', description: '找出原文中匹配的片段或单张图片中匹配的区域。' } },
  inputKinds: [
    { id: 'text', title: 'Text', translations: { 'zh-CN': '文本' } },
    { id: 'image', title: 'Image', translations: { 'zh-CN': '图片' } },
  ],
  getInputKind: ({ source }) => source.type,
  parseInput: (input) => inputSchema.parse(input),
  parseOutput(output, { source }) {
    if (source.type === 'image') return imageOutput.parse(output)
    const value = textOutput.parse(output)
    const offsets = utf16Boundaries(source.text)
    for (const { text, start, end } of value.matches) {
      const from = offsets[start], to = offsets[end]
      if (from === undefined || to === undefined || start >= end || source.text.slice(from, to) !== text)
        throw new Error('A returned span does not match the original text at its coordinates.')
    }
    return value
  },
  checkCapabilities: (input, capabilities) => capabilities.checkInput?.(input),
  tool: {
    name: 'system1_locate',
    description:
      'Find matching passages in exact source text or matching regions in one image using the configured Locate route. ' +
      'Text ranges use zero-based Unicode code points with the end excluded. Image coordinates are fractions of the image from its top-left corner. ' +
      'A successful empty matches list means no matches were returned. The result is not proof that all matches were found.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['source', 'instructions'],
      properties: {
        instructions: { type: 'string', description: 'Describe one kind of evidence to locate.' },
        source: {
          type: 'object',
          additionalProperties: false,
          required: ['type'],
          description: 'For type text provide only text; for image provide only image.',
          properties: {
            type: { type: 'string', enum: ['text', 'image'] },
            text: { type: 'string', description: 'The original text, with whitespace unchanged.' },
            image: {
              type: 'object',
              additionalProperties: false,
              required: ['mediaType', 'data'],
              properties: {
                mediaType: { type: 'string', enum: ['image/png', 'image/jpeg', 'image/webp'] },
                data: { type: 'string', description: 'Padded Base64 without the data URL prefix.' },
              },
            },
          },
        },
      },
    },
    output: {
      type: 'object',
      required: ['status', 'meta'],
      properties: {
        status: { type: 'string', enum: ['ok', 'error'] },
        matches: { type: 'array', items: { type: 'object' } },
        mayHaveMore: { type: 'boolean' },
        meta: { type: 'object' },
        error: { type: 'object' },
        reason: { type: 'string' },
      },
    },
    toOutput: toLocateResult,
  },
})
