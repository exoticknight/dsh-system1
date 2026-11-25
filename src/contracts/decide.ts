import type { DecisionError } from './error.js'
import { defineOperation } from './operation.js'
import type { DecideInput, DecideOutput, ModelCapabilities } from './provider.js'
import { parseRequest, responseSchema, decodedBase64Length } from '../core/validation.js'

export const decideOutputSchema = responseSchema.omit({ model: true, revision: true })

export const decideOperation = defineOperation<DecideInput, DecideOutput, ModelCapabilities>({
  id: 'decide',
  version: 1,
  title: 'Decision',
  description: 'Ask structured questions about shared content.',
  translations: { 'zh-CN': { title: '决策', description: '对同一份材料提出结构化问题。' } },
  inputKinds: [
    { id: 'text', title: 'Text or JSON', translations: { 'zh-CN': '文本或 JSON' } },
    { id: 'image', title: 'Image', translations: { 'zh-CN': '图片' } },
    { id: 'audio', title: 'Audio', translations: { 'zh-CN': '音频' } },
    { id: 'video', title: 'Video', translations: { 'zh-CN': '视频' } },
  ],
  parseInput: parseRequest,
  parseOutput: (output) => decideOutputSchema.parse(output),
  checkCapabilities: (input, capabilities) => checkCapabilities(capabilities, input),
})

function checkCapabilities(
  c: ModelCapabilities,
  request: DecideInput,
): DecisionError | undefined {
  const all = Object.values(request.questions)
  if (request.longContext && !c.longContext)
    return {
      code: 'unsupported',
      message: 'Model does not support extended context.',
    }
  if (request.images?.length) {
    const imageCapabilities = c.images
    if (!imageCapabilities)
      return {
        code: 'unsupported',
        message: 'Model does not support image input.',
      }
    if (request.images.length > imageCapabilities.maxCount)
      return {
        code: 'limit_exceeded',
        message: 'Too many images for this model.',
      }
    if (
      request.images.some(
        (image) => !imageCapabilities.formats.includes(image.mediaType),
      )
    )
      return {
        code: 'unsupported',
        message: 'Image format is not supported by this model.',
      }
    const imageBytes = request.images.map((image) => decodedBase64Length(image.data))
    if (imageBytes.some((size) => size > imageCapabilities.maxBytesPerImage))
      return {
        code: 'limit_exceeded',
        message: 'An image exceeds this model’s per-image size limit.',
      }
    if (
      imageBytes.reduce((sum, size) => sum + size, 0) >
      imageCapabilities.maxTotalBytes
    )
      return {
        code: 'limit_exceeded',
        message: 'Image attachments exceed this model’s size limit.',
      }
  }
  const audioError = checkMediaCapabilities(
    request.audio,
    c.audio,
    'audio',
  )
  if (audioError) return audioError
  const videoError = checkMediaCapabilities(
    request.videos,
    c.videos,
    'video',
  )
  if (videoError) return videoError
  if (request.audio?.length || request.videos?.length) {
    const maxTotalBytes = c.audioVideo?.maxTotalBytes
    const totalBytes = [
      ...(request.audio ?? []),
      ...(request.videos ?? []),
    ].reduce((sum, item) => sum + decodedBase64Length(item.data), 0)
    if (maxTotalBytes !== undefined && totalBytes > maxTotalBytes)
      return {
        code: 'limit_exceeded',
        message: 'Audio and video attachments exceed this model’s size limit.',
      }
  }
  if (c.maxQuestions !== null && all.length > c.maxQuestions)
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
      c.maxChoiceOptions !== null &&
      Object.keys(q.criteria).length > c.maxChoiceOptions
    )
      return {
        code: 'limit_exceeded',
        message: 'Too many choice options for this model.',
      }
    if (
      q.type === 'score' &&
      c.maxScoreLevels !== null &&
      q.criteria.length > c.maxScoreLevels
    )
      return {
        code: 'limit_exceeded',
        message: 'Too many score levels for this model.',
      }
  }
}

function checkMediaCapabilities<TMediaType extends string>(
  inputs: readonly { readonly mediaType: TMediaType; readonly data: string }[] | undefined,
  capabilities: {
    readonly formats: readonly TMediaType[]
    readonly maxCount: number
    readonly maxBytesPerItem: number
  } | undefined,
  modality: 'audio' | 'video',
): DecisionError | undefined {
  if (!inputs?.length) return undefined
  const label = modality === 'audio' ? 'Audio' : 'Video'
  if (!capabilities)
    return {
      code: 'unsupported',
      message: `Model does not support ${modality} input.`,
    }
  if (inputs.length > capabilities.maxCount)
    return {
      code: 'limit_exceeded',
      message: `Too many ${modality} attachments for this model.`,
    }
  if (inputs.some(({ mediaType }) => !capabilities.formats.includes(mediaType)))
    return {
      code: 'unsupported',
      message: `${label} format is not supported by this model.`,
    }
  if (
    inputs.some(({ data }) => decodedBase64Length(data) > capabilities.maxBytesPerItem)
  )
    return {
      code: 'limit_exceeded',
      message: `A ${modality} attachment exceeds this model’s size limit.`,
    }
}
