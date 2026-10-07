export interface FallbackModelDraft {
    provider: string;
    model: string;
}
export declare function readFallbackModels(value: unknown): FallbackModelDraft[];
export declare function fallbackModelsValid(rows: readonly FallbackModelDraft[]): boolean;
export declare function fallbackModelsEqual(left: readonly FallbackModelDraft[], right: readonly FallbackModelDraft[]): boolean;
export declare function addFallbackModel(rows: readonly FallbackModelDraft[], model: FallbackModelDraft): FallbackModelDraft[];
export declare function updateFallbackModel(rows: readonly FallbackModelDraft[], index: number, update: Partial<FallbackModelDraft>): FallbackModelDraft[];
export declare function moveFallbackModel(rows: readonly FallbackModelDraft[], index: number, offset: -1 | 1): FallbackModelDraft[];
export declare function removeFallbackModel(rows: readonly FallbackModelDraft[], index: number): FallbackModelDraft[];
