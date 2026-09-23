import type { JsonValue, Questions } from './question.js'
import type { QuestionResult } from './answer.js'
export interface ModelRef {
  readonly provider: string
  readonly model: string
}
export interface Usage {
  readonly inputTokens?: number | undefined
  readonly outputTokens?: number | undefined
}
export interface ExecutionModel {
  readonly provider: string
  readonly model: string
  readonly revision?: string
}
export interface DecisionMeta {
  readonly requestId: string
  readonly requested: ModelRef
  readonly executed?: ExecutionModel | undefined
  readonly durationMs: number
  readonly usage?: Usage | undefined
  readonly approximate?: boolean | undefined
  readonly degraded?: boolean | undefined
  readonly warnings?: readonly string[] | undefined
}
export interface DecideRequest<Q extends Questions = Questions> {
  readonly state: JsonValue
  readonly questions: Q
  readonly model?: ModelRef | undefined
  readonly signal?: AbortSignal | undefined
  readonly timeoutMs?: number | undefined
}
export interface DecideResponse<Q extends Questions = Questions> {
  readonly answers: { readonly [K in keyof Q]: QuestionResult<Q[K]> }
  readonly meta: DecisionMeta
}
export interface System1Options {
  readonly defaultModel?: ModelRef | undefined
  readonly timeoutMs?: number
}
