import type { JsonValue, Questions } from './question.js';
import type { QuestionResult } from './answer.js';
import type { DecisionError } from './error.js';
export interface ModelRef {
    readonly provider: string;
    readonly model: string;
}
export interface Usage {
    readonly inputTokens?: number | undefined;
    readonly outputTokens?: number | undefined;
}
export interface ExecutionModel {
    readonly provider: string;
    readonly model: string;
    readonly revision?: string;
}
export interface FallbackAttempt extends ModelRef {
    readonly error: Pick<DecisionError, 'code' | 'message'>;
}
export type ImageMediaType = 'image/png' | 'image/jpeg' | 'image/webp';
export interface ImageInput {
    /** MIME type of the decoded image bytes. */
    readonly mediaType: ImageMediaType;
    /** Standard padded base64 without a data-URL prefix. */
    readonly data: string;
}
export interface DecisionMeta {
    readonly requestId: string;
    readonly requested: ModelRef;
    readonly executed?: ExecutionModel | undefined;
    readonly durationMs: number;
    readonly usage?: Usage | undefined;
    readonly approximate?: boolean | undefined;
    readonly degraded?: boolean | undefined;
    readonly warnings?: readonly string[] | undefined;
    readonly attempts?: readonly FallbackAttempt[] | undefined;
}
export interface DecideRequest<Q extends Questions = Questions> {
    readonly state: JsonValue;
    readonly questions: Q;
    /** Images attached to the shared state and made available to every question. */
    readonly images?: readonly ImageInput[] | undefined;
    /** Opt in to a provider's extended-context mode when it supports one. */
    readonly longContext?: boolean | undefined;
    readonly model?: ModelRef | undefined;
    readonly signal?: AbortSignal | undefined;
    readonly timeoutMs?: number | undefined;
}
export interface DecideResponse<Q extends Questions = Questions> {
    readonly answers: {
        readonly [K in keyof Q]: QuestionResult<Q[K]>;
    };
    readonly meta: DecisionMeta;
}
export interface System1Options {
    readonly defaultModel?: ModelRef | undefined;
    readonly fallbackModels?: readonly ModelRef[];
    readonly timeoutMs?: number;
}
//# sourceMappingURL=request.d.ts.map