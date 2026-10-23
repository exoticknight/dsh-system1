import type { JsonValue, Primitive, Questions } from './question.js'
import type {
  AudioInput,
  AudioMediaType,
  ImageInput,
  ImageMediaType,
  Usage,
  VideoInput,
  VideoMediaType,
} from './request.js'

/** A selectable model ID and provider-owned alternate IDs accepted at runtime. */
export interface ProviderModel {
  readonly id: string
  readonly aliases?: readonly string[]
}

export interface ModelCapabilities {
  readonly primitives: readonly Primitive[]
  readonly maxQuestions: number | null
  readonly maxChoiceOptions: number | null
  readonly maxScoreLevels: number | null
  readonly images?:
    | {
        readonly formats: readonly ImageMediaType[]
        readonly maxCount: number
        readonly maxBytesPerImage: number
        readonly maxTotalBytes: number
      }
    | undefined
  readonly audio?: MediaCapabilities<AudioMediaType> | undefined
  readonly videos?: MediaCapabilities<VideoMediaType> | undefined
  /** Aggregate decoded byte limit shared by the audio and video attachments. */
  readonly audioVideo?: { readonly maxTotalBytes?: number | undefined } | undefined
  readonly longContext?: { readonly maxTokens: number } | undefined
  /** Informational: the provider must enforce its own tokenizer budget. */
  readonly context?:
    | {
        readonly maxTokens: number
        readonly includesQuestions: boolean
        readonly maxStatePlusQuestionTokens?: number | undefined
      }
    | undefined
}
export interface MediaCapabilities<TMediaType extends string> {
  readonly formats: readonly TMediaType[]
  readonly maxCount: number
  readonly maxBytesPerItem: number
}
export interface ProviderRequest {
  readonly model: string
  readonly state: JsonValue
  readonly questions: Questions
  readonly images?: readonly ImageInput[] | undefined
  readonly audio?: readonly AudioInput[] | undefined
  readonly videos?: readonly VideoInput[] | undefined
  readonly longContext?: boolean | undefined
  readonly requestId: string
}
export interface ProviderResponse {
  readonly model: string
  readonly revision?: string | undefined
  /** Standard QuestionResult values, validated independently by the core. */
  readonly answers: Readonly<Record<string, unknown>>
  readonly usage?: Usage | undefined
  readonly approximate?: boolean | undefined
  readonly degraded?: boolean | undefined
}
export interface System1Provider {
  /** Timeout for this provider when the caller does not set one. */
  timeoutMs(): number
  describe(model: string, signal: AbortSignal): Promise<ModelCapabilities>
  evaluate(
    request: ProviderRequest,
    signal: AbortSignal,
  ): Promise<ProviderResponse>
}
