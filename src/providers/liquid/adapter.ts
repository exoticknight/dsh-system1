import { System1ProviderError } from '../../contracts/error.js'
import { findProviderModel } from '../models.js'
import { createSystemOneDecisionImplementation } from '../systemone.js'
import { LIQUID_BASE_URL, LIQUID_MODELS, LIQUID_TIMEOUT_MS } from './models.js'

const MAX_BODY_BYTES = 4_500_000
// Upper bound before Base64 expansion; the exact JSON limit is checked below.
const MAX_DECODED_BYTES = MAX_BODY_BYTES * 3 / 4

export interface LiquidOptions {
  apiKey?: string
  baseURL?: string
  timeoutMs?: number
  resolveTimeoutMs?: () => number | undefined
  resolveApiKey?: () => string | undefined | Promise<string | undefined>
  resolveBaseURL?: () => string | undefined
  fetch?: typeof fetch
}

export function createLiquidProvider(options: LiquidOptions = {}) {
  return createSystemOneDecisionImplementation(LIQUID_MODELS, {
    providerName: 'Liquid AI',
    defaultBaseURL: options.baseURL ?? LIQUID_BASE_URL,
    timeoutMs: () => options.resolveTimeoutMs?.() ?? options.timeoutMs ?? LIQUID_TIMEOUT_MS,
    resolveApiKey: options.resolveApiKey ?? (() => options.apiKey),
    ...(options.resolveBaseURL ? { resolveBaseURL: options.resolveBaseURL } : {}),
    resolveModel: (model) => findProviderModel(LIQUID_MODELS, model),
    capabilities: {
      primitives: ['noul', 'choice', 'score'],
      maxQuestions: 128,
      maxChoiceOptions: null,
      maxScoreLevels: null,
      images: {
        formats: ['image/png', 'image/jpeg', 'image/webp'],
        maxCount: 8,
        maxBytesPerImage: MAX_DECODED_BYTES,
        maxTotalBytes: MAX_DECODED_BYTES,
      },
      audio: {
        formats: ['audio/wav', 'audio/mpeg'],
        maxCount: 8,
        maxBytesPerItem: MAX_DECODED_BYTES,
      },
      context: {
        maxTokens: 65_536,
        includesQuestions: false,
        maxStatePlusQuestionTokens: 65_536,
      },
    },
    roundedProbabilities: true,
    serializeRequest: ({ model, state, questions, images, audio }) => {
      const media = (items: readonly { mediaType: string; data: string }[]) =>
        items.map(({ mediaType, data }) => ({ content_type: mediaType, base64: data }))
      const body = {
        state,
        questions,
        ...(images?.length ? { images: media(images) } : {}),
        ...(audio?.length ? { audio: media(audio) } : {}),
      }
      if (Buffer.byteLength(JSON.stringify({ ...body, model })) >= MAX_BODY_BYTES)
        throw new System1ProviderError({
          code: 'limit_exceeded',
          message: 'Liquid AI requires an encoded request body under 4.5 MB.',
        })
      return { body }
    },
    ...(options.fetch ? { fetch: options.fetch } : {}),
  })
}
