import { randomUUID } from 'node:crypto'
import {
  APIConnectionError,
  APIError,
  APIUserAbortError,
  NaceClient,
  imageInput,
} from 'nace-sdk'
import type {
  EntryType as NaceEntryType,
  ImageInput as NaceImageInput,
  Question as NaceQuestion,
  UploadedFile,
} from 'nace-sdk'
import type { System1Provider } from '../../contracts/index.js'
import type { ImageInput, ModelCapabilities, ProviderRequest } from '../../contracts/index.js'
import { System1ProviderError } from '../../contracts/error.js'
import { findProviderModel } from '../models.js'
import { normalizeSystemOneResponse, stringifyDescription } from '../systemone.js'
import { NACE_MODELS } from './models.js'

const DEFAULT_BASE_URL = 'https://console.nace.ai'
const MAX_REQUEST_BYTES = 4_194_304
const SDK_TIMEOUT_MS = 2_147_483_647
const CLEANUP_TIMEOUT_MS = 5_000
const DEFAULT_TIMEOUT_MS = 60_000

const MODEL_CAPABILITIES = {
  'drex-v1.5': {
    primitives: ['noul', 'choice', 'score'],
    maxQuestions: 512,
    context: {
      maxTokens: 131_072,
      includesQuestions: false,
      maxStatePlusQuestionTokens: 139_264,
    },
  },
  'drex-v2.0': {
    primitives: ['noul', 'choice', 'score'],
    maxQuestions: 512,
    context: {
      maxTokens: 131_072,
      includesQuestions: false,
      maxStatePlusQuestionTokens: 262_144,
    },
  },
  'drex-max': {
    primitives: ['noul', 'choice', 'score'],
    maxQuestions: 16,
    maxChoiceOptions: 255,
    maxScoreLevels: 255,
    images: {
      formats: ['image/png', 'image/jpeg', 'image/webp'],
      maxCount: 8,
      maxBytesPerImage: 16 * 1024 * 1024,
      maxTotalBytes: 32 * 1024 * 1024,
    },
    context: {
      maxTokens: 131_072,
      includesQuestions: false,
      maxStatePlusQuestionTokens: 262_144,
    },
  },
} as const satisfies Record<(typeof NACE_MODELS)[number]['id'], ModelCapabilities>

export interface NaceOptions {
  apiKey: string
  baseURL?: string
  resolveApiKey?: () => string | undefined | Promise<string | undefined>
  resolveBaseURL?: () => string | undefined
  fetch?: typeof fetch
  warn?: (message: string) => void
}

/** Nace Drex adapter: the official SDK owns API and temporary-file transport. */
export function createNaceProvider(options: NaceOptions): System1Provider {
  return {
    defaultTimeoutMs: DEFAULT_TIMEOUT_MS,
    async describe(model) {
      const selected = findProviderModel(NACE_MODELS, model)
      if (!selected)
        throw new System1ProviderError({
          code: 'unsupported',
          message: 'Nace model is not supported.',
        })
      return MODEL_CAPABILITIES[selected.id]
    },
    async evaluate(request, signal) {
      const selected = findProviderModel(NACE_MODELS, request.model)
      if (!selected)
        throw new System1ProviderError({
          code: 'unsupported',
          message: 'Nace model is not supported.',
        })
      if (request.images?.length && selected.id !== 'drex-max')
        throw new System1ProviderError({
          code: 'unsupported',
          message: 'Nace images require drex-max.',
        })

      let apiKey: string | undefined
      try {
        apiKey = await (options.resolveApiKey ?? (() => options.apiKey))()
      } catch {
        throw new System1ProviderError({
          code: 'unavailable',
          message: 'Nace API key could not be resolved.',
        })
      }
      if (!apiKey?.trim())
        throw new System1ProviderError({
          code: 'unavailable',
          message: 'Nace API key is not configured.',
        })

      const client = new NaceClient({
        apiKey: apiKey.trim(),
        baseURL: resolveBaseURL(options),
        defaultModel: selected.id,
        timeout: SDK_TIMEOUT_MS,
        retry: { maxRetries: 0 },
        logLevel: 'off',
        ...(options.fetch ? { fetch: options.fetch } : {}),
      })
      const uploaded: UploadedFile[] = []
      try {
        const questions = toNaceQuestions(request)
        const images = await prepareImages(
          client,
          request,
          questions,
          signal,
          uploaded,
        )
        signal.throwIfAborted()
        const response = await client.systemOne(
          {
            model: selected.id,
            state: request.state as NaceEntryType,
            questions,
            ...(images?.length ? { images } : {}),
          },
          {
            signal,
            timeout: SDK_TIMEOUT_MS,
            retry: { maxRetries: 0 },
          },
        )
        signal.throwIfAborted()
        return normalizeSystemOneResponse(
          { ...request, model: selected.id },
          response,
          'Nace',
        )
      } catch (error) {
        if (signal.aborted) signal.throwIfAborted()
        if (error instanceof System1ProviderError) throw error
        throw mapNaceError(error)
      } finally {
        // Deletion is best-effort and must not consume the inference deadline or replace its result.
        void deleteTemporaryFiles(client, uploaded, options.warn)
      }
    },
  }
}

async function prepareImages(
  client: NaceClient,
  request: ProviderRequest,
  questions: Record<string, NaceQuestion>,
  signal: AbortSignal,
  uploaded: UploadedFile[],
): Promise<readonly NaceImageInput[] | undefined> {
  if (!request.images?.length) {
    ensureRequestFits(request.state, questions)
    return undefined
  }

  const files = request.images.map((image) => {
    const bytes = Buffer.from(image.data, 'base64')
    let inline: NaceImageInput
    try {
      inline = imageInput(bytes)
    } catch {
      throw new System1ProviderError({
        code: bytes.byteLength > 16 * 1024 * 1024 ? 'limit_exceeded' : 'unsupported',
        message: 'Nace Drex Max requires valid PNG, JPEG, or WebP image bytes.',
      })
    }
    if (
      typeof inline !== 'string' ||
      !inline.startsWith(`data:${image.mediaType};base64,`)
    )
      throw new System1ProviderError({
        code: 'unsupported',
        message: 'Nace image bytes do not match their declared media type.',
      })
    return { bytes, inline }
  })
  const images: NaceImageInput[] = files.map(({ inline }) => inline)

  if (serializedBodySize(request.state, questions, images) > MAX_REQUEST_BYTES) {
    const bodyWithoutImages = serializedBodySize(request.state, questions)
    if (bodyWithoutImages > MAX_REQUEST_BYTES)
      throw requestBodyLimitError()
    const referenceOnlyImages = files.map(() => ({
      type: 'workspace_file' as const,
      workspace_id: '00000000-0000-4000-8000-000000000001',
      file_id: '00000000-0000-4000-8000-000000000002',
    }))
    if (
      serializedBodySize(request.state, questions, referenceOnlyImages) >
      MAX_REQUEST_BYTES
    )
      throw requestBodyLimitError()

    const largestFirst = files
      .map((file, index) => ({ index, size: Buffer.byteLength(file.inline) }))
      .sort((a, b) => b.size - a.size)
    for (const { index } of largestFirst) {
      if (serializedBodySize(request.state, questions, images) <= MAX_REQUEST_BYTES)
        break
      const { bytes } = files[index]!
      let file: UploadedFile
      try {
        file = await client.documents.upload(
          bytes,
          {
            file_name: `dsh-system1-${randomUUID()}-${index + 1}.${extensionFor(request.images[index]!.mediaType)}`,
          },
          { signal, timeout: SDK_TIMEOUT_MS, retry: { maxRetries: 0 } },
        )
      } catch (error) {
        if (signal.aborted) signal.throwIfAborted()
        throw mapNaceError(error)
      }
      uploaded.push(file)
      images[index] = imageInput(file)
    }
  }

  if (serializedBodySize(request.state, questions, images) > MAX_REQUEST_BYTES)
    throw requestBodyLimitError()
  return images
}

function toNaceQuestions(
  request: ProviderRequest,
): Record<string, NaceQuestion> {
  const result: Record<string, NaceQuestion> = {}
  for (const [id, question] of Object.entries(request.questions)) {
    const instructions = stringifyDescription(question.instructions)
    if (question.type === 'noul') {
      const criteria: { true?: string | null; false?: string | null } = {}
      if (question.criteria?.true !== undefined)
        criteria.true = stringifyDescription(question.criteria.true)
      if (question.criteria?.false !== undefined)
        criteria.false = stringifyDescription(question.criteria.false)
      result[id] = {
        type: 'noul',
        instructions,
        ...(Object.keys(criteria).length ? { criteria } : {}),
      }
    } else if (question.type === 'choice') {
      result[id] = {
        type: 'choice',
        instructions,
        criteria: Object.fromEntries(
          Object.entries(question.criteria).map(([key, value]) => [
            key,
            value === null ? null : stringifyDescription(value),
          ]),
        ),
      }
    } else if (question.type === 'score') {
      result[id] = {
        type: 'score',
        instructions,
        criteria: question.criteria.map(stringifyDescription) as [string, ...string[]],
      }
    } else {
      throw new System1ProviderError({
        code: 'unsupported',
        message: 'Nace does not support box questions.',
      })
    }
  }
  return result
}

function ensureRequestFits(
  state: ProviderRequest['state'],
  questions: Record<string, NaceQuestion>,
  images?: readonly NaceImageInput[],
): void {
  if (serializedBodySize(state, questions, images) > MAX_REQUEST_BYTES)
    throw requestBodyLimitError()
}

function serializedBodySize(
  state: ProviderRequest['state'],
  questions: Record<string, NaceQuestion>,
  images?: readonly NaceImageInput[],
): number {
  return Buffer.byteLength(JSON.stringify({
    state,
    questions,
    ...(images?.length ? { images } : {}),
  }))
}

function requestBodyLimitError(): System1ProviderError {
  return new System1ProviderError({
    code: 'limit_exceeded',
    message: 'Nace request body exceeds 4 MiB.',
  })
}

async function deleteTemporaryFiles(
  client: NaceClient,
  files: readonly UploadedFile[],
  warn?: (message: string) => void,
): Promise<void> {
  for (const file of files) {
    try {
      const result = await client.documents.deleteFile(
        file.workspace_id,
        file.file_id,
        {
          signal: AbortSignal.timeout(CLEANUP_TIMEOUT_MS),
          timeout: CLEANUP_TIMEOUT_MS,
          retry: { maxRetries: 0 },
        },
      )
      if (result.status !== 'deleted') warnCleanupFailure(warn)
    } catch {
      warnCleanupFailure(warn)
    }
  }
}

function warnCleanupFailure(warn?: (message: string) => void): void {
  try {
    warn?.('Nace temporary image cleanup did not finish; Nace retention policy will expire the upload.')
  } catch {
    // Cleanup logging must never replace the inference result or its original error.
  }
}

function mapNaceError(error: unknown): System1ProviderError {
  if (error instanceof APIError) {
    const status = error.status
    if (status === 401 || status === 403)
      return new System1ProviderError({
        code: 'unavailable',
        message: 'Nace API authentication or permission failed.',
        httpStatus: status,
        retryable: false,
      })
    if (status === 402)
      return new System1ProviderError({
        code: 'provider_error',
        message: 'Nace account has insufficient credit.',
        httpStatus: status,
        retryable: false,
      })
    if (status === 422)
      return new System1ProviderError({
        code: 'provider_error',
        message: 'Nace rejected the request.',
        httpStatus: status,
        retryable: false,
      })
    return new System1ProviderError({
      code: 'provider_error',
      message: 'Nace request failed.',
      httpStatus: status,
      retryable: status === 408 || status === 429 || status >= 500,
    })
  }
  if (error instanceof APIConnectionError)
    return new System1ProviderError({
      code: 'provider_error',
      message: 'Nace connection failed.',
      retryable: true,
    })
  if (error instanceof APIUserAbortError)
    return new System1ProviderError({
      code: 'cancelled',
      message: 'Decision cancelled.',
    })
  return new System1ProviderError({
    code: 'provider_error',
    message: 'Nace provider failed.',
  })
}

function resolveBaseURL(options: NaceOptions): string {
  const value = options.resolveBaseURL?.() ?? options.baseURL ?? DEFAULT_BASE_URL
  return value.trim() || DEFAULT_BASE_URL
}

function extensionFor(mediaType: ImageInput['mediaType']): string {
  switch (mediaType) {
    case 'image/png':
      return 'png'
    case 'image/jpeg':
      return 'jpg'
    case 'image/webp':
      return 'webp'
  }
}
