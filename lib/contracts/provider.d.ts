import type { JsonValue, Primitive, Questions } from './question.js';
import type { Usage } from './request.js';
export interface ModelCapabilities {
    readonly primitives: readonly Primitive[];
    readonly maxQuestions?: number | undefined;
    readonly maxChoiceOptions?: number | undefined;
    readonly maxScoreLevels?: number | undefined;
    /** Informational: the provider must enforce its own tokenizer budget. */
    readonly context?: {
        readonly maxTokens: number;
        readonly includesQuestions: boolean;
        readonly maxStatePlusQuestionTokens?: number | undefined;
    } | undefined;
}
export interface ProviderRequest {
    readonly model: string;
    readonly state: JsonValue;
    readonly questions: Questions;
    readonly requestId: string;
}
export interface ProviderResponse {
    readonly model: string;
    readonly revision?: string | undefined;
    /** Standard QuestionResult values, validated independently by the core. */
    readonly answers: Readonly<Record<string, unknown>>;
    readonly usage?: Usage | undefined;
    readonly approximate?: boolean | undefined;
    readonly degraded?: boolean | undefined;
}
export interface System1Provider {
    describe(model: string, signal: AbortSignal): Promise<ModelCapabilities>;
    evaluate(request: ProviderRequest, signal: AbortSignal): Promise<ProviderResponse>;
}
//# sourceMappingURL=provider.d.ts.map