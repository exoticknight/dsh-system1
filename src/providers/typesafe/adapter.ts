import { randomUUID } from 'node:crypto'
import type { System1Provider } from '../../contracts/index.js'
import { createSystemOneHttpProvider } from '../systemone.js'

export interface TypesafeOptions {
  apiKey: string
  baseURL?: string
  resolveApiKey?: () => string | undefined | Promise<string | undefined>
  resolveBaseURL?: () => string | undefined
  fetch?: typeof fetch
}

const MODELS = new Set(['jev-latest', 'jev-preview', 'jev-1.13.0', 'jev-1.14.0'])

export function createTypesafeProvider(
  options: TypesafeOptions,
): System1Provider {
  return createSystemOneHttpProvider({
    providerName: 'TypeSafe',
    defaultBaseURL: options.baseURL ?? 'https://api.typesafe.ai',
    resolveApiKey: options.resolveApiKey ?? (() => options.apiKey),
    ...(options.resolveBaseURL ? { resolveBaseURL: options.resolveBaseURL } : {}),
    apiKeyRequired: true,
    isModelSupported: (model) => MODELS.has(model),
    capabilities: (model) => ({
      primitives: [
        'noul',
        'choice',
        'score',
        ...(model === 'jev-1.14.0' || model === 'jev-preview' ? ['box' as const] : []),
      ],
      maxChoiceOptions: 255,
      maxScoreLevels: 10,
      images: {
        formats: ['image/png', 'image/jpeg'],
        maxBytesPerImage: 16 * 1024 * 1024,
        maxTotalBytes: 16 * 1024 * 1024,
      },
      longContext: { maxTokens: 262_144 },
      context: {
        maxTokens: 64_000,
        includesQuestions: true,
        maxStatePlusQuestionTokens: 32_000,
      },
    }),
    serializeRequest: (request) => {
      const assets: Record<string, {
        type: 'image'
        format: 'png' | 'jpg'
        data_base64: string
      }> = {}
      const imageReferences = (request.images ?? []).map((image) => {
        const reference = randomUUID()
        assets[reference] = {
          type: 'image',
          format: image.mediaType === 'image/png' ? 'png' : 'jpg',
          data_base64: image.data,
        }
        return reference
      })
      const needsImagesHeader =
        imageReferences.length > 0 ||
        Object.values(request.questions).some((question) => question.type === 'box')
      return {
        body: {
          state: imageReferences.length
            ? { state: request.state, images: imageReferences }
            : request.state,
          questions: request.questions,
          ...(imageReferences.length ? { assets } : {}),
        },
        headers: {
          ...(needsImagesHeader
            ? { 'TypeSafe-Danger-Zone-Images': 'true' }
            : {}),
          ...(request.longContext
            ? { 'TypeSafe-Danger-Zone-Long-Context': 'true' }
            : {}),
        },
      }
    },
    ...(options.fetch ? { fetch: options.fetch } : {}),
  })
}
