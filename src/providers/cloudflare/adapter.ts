import type { System1Provider } from '../../contracts/index.js'
import type { ModelCapabilities } from '../../contracts/provider.js'
import { System1ProviderError } from '../../contracts/error.js'
import { findProviderModel } from '../models.js'
import { normalizeSystemOneResponse } from '../systemone.js'
import { CLOUDFLARE_MODELS } from './models.js'

export interface CloudflareOptions {
  apiKey?: string
  accountId?: string
  baseURL?: string
  timeoutMs?: number
  resolveTimeoutMs?: () => number | undefined
  resolveApiKey?: () => string | undefined | Promise<string | undefined>
  resolveAccountId?: () => string | undefined | Promise<string | undefined>
  resolveBaseURL?: () => string | undefined
  fetch?: typeof fetch
}

type CloudflareModelId = (typeof CLOUDFLARE_MODELS)[number]['id']
const DEFAULT_TIMEOUT_MS = 800

const MAX_TOKENS_BY_MODEL: Readonly<Record<CloudflareModelId, number>> = {
  clef: 65_536,
  'clef-flash': 24_576,
  'clef-omni': 64_000,
}

function resolveCloudflareModel(model: string) {
  const definition = findProviderModel(CLOUDFLARE_MODELS, model)
  if (!definition) return undefined
  return { id: definition.id, maxTokens: MAX_TOKENS_BY_MODEL[definition.id] }
}

const CAPABILITIES: Omit<ModelCapabilities, 'context'> = {
  primitives: ['noul', 'choice', 'score'],
  maxQuestions: 64,
  maxChoiceOptions: null,
  maxScoreLevels: null,
  images: {
    formats: ['image/png', 'image/jpeg', 'image/webp'],
    maxCount: 4,
    maxBytesPerImage: 4 * 1024 * 1024,
    maxTotalBytes: 8 * 1024 * 1024,
  },
}
const OMNI_CAPABILITIES: Pick<ModelCapabilities, 'audio' | 'videos' | 'audioVideo'> = {
  audio: {
    formats: ['audio/wav', 'audio/mpeg'],
    maxCount: 4,
    maxBytesPerItem: 8 * 1024 * 1024,
  },
  videos: {
    formats: ['video/mp4', 'video/webm'],
    maxCount: 2,
    maxBytesPerItem: 16 * 1024 * 1024,
  },
  audioVideo: { maxTotalBytes: 16 * 1024 * 1024 },
}

/** Cloudflare REST transport for the native System One Clef models. */
export function createCloudflareProvider(
  options: CloudflareOptions = {},
): System1Provider {
  const fetchFn = options.fetch ?? globalThis.fetch
  return {
    timeoutMs: () => options.resolveTimeoutMs?.() ?? options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    async describe(model) {
      const selectedModel = resolveCloudflareModel(model)
      if (!selectedModel)
        throw new System1ProviderError({
          code: 'unsupported',
          message: 'Cloudflare model is not supported.',
        })
      return {
        ...CAPABILITIES,
        ...(selectedModel.id === 'clef-omni' ? OMNI_CAPABILITIES : {}),
        context: { maxTokens: selectedModel.maxTokens, includesQuestions: true },
      }
    },
    async evaluate(request, signal) {
      const selectedModel = resolveCloudflareModel(request.model)
      if (!selectedModel)
        throw new System1ProviderError({
          code: 'unsupported',
          message: 'Cloudflare model is not supported.',
        })
      const canonicalRequest =
        request.model === selectedModel.id
          ? request
          : { ...request, model: selectedModel.id }

      let apiKey: string | undefined
      let accountId: string | undefined
      try {
        apiKey = await (options.resolveApiKey ?? (() => options.apiKey))()
        accountId = await (options.resolveAccountId ?? (() => options.accountId))()
      } catch {
        throw new System1ProviderError({
          code: 'unavailable',
          message: 'Cloudflare credentials could not be resolved.',
        })
      }
      if (!apiKey?.trim() || !accountId?.trim())
        throw new System1ProviderError({
          code: 'unavailable',
          message: 'Cloudflare API token and account ID are required.',
        })

      const baseURL = options.resolveBaseURL?.() ?? options.baseURL ?? 'https://api.cloudflare.com/client/v4'
      let response: Response
      try {
        response = await fetchFn(
          `${trimTrailingSlashes(baseURL)}/accounts/${encodeURIComponent(accountId.trim())}/ai/run/@cf/cloudflare/${selectedModel.id}`,
          {
            method: 'POST',
            redirect: 'error',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey.trim()}`,
            },
            body: JSON.stringify({
              model: selectedModel.id,
              state: request.state,
              ...(request.images?.length
                ? {
                    images: request.images.map(
                      ({ mediaType, data }) => `data:${mediaType};base64,${data}`,
                    ),
                  }
                : {}),
              ...(request.audio?.length
                ? {
                    audio: request.audio.map(
                      ({ mediaType, data }) => `data:${mediaType};base64,${data}`,
                    ),
                  }
                : {}),
              ...(request.videos?.length
                ? {
                    videos: request.videos.map(
                      ({ mediaType, data }) => `data:${mediaType};base64,${data}`,
                    ),
                  }
                : {}),
              questions: request.questions,
            }),
            signal,
          },
        )
      } catch {
        signal.throwIfAborted()
        throw new System1ProviderError({
          code: 'provider_error',
          message: 'Cloudflare transport failed.',
          retryable: true,
        })
      }

      if (!response.ok) {
        await response.body?.cancel()
        throw new System1ProviderError({
          code: response.status === 401 || response.status === 403
            ? 'unavailable'
            : 'provider_error',
          message: 'Cloudflare request failed.',
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
          message: 'Cloudflare returned an invalid response.',
        })
      }

      const result = unwrapCloudflareResult(raw)
      return normalizeSystemOneResponse(canonicalRequest, result, 'Cloudflare')
    },
  }
}

function unwrapCloudflareResult(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || !('success' in raw)) return raw
  const envelope = raw as { success?: unknown; result?: unknown }
  if (envelope.success !== true)
    throw new System1ProviderError({
      code: 'provider_error',
      message: 'Cloudflare request failed.',
    })
  return envelope.result
}

function trimTrailingSlashes(value: string): string {
  return value.trim().replace(/\/+$/u, '')
}
