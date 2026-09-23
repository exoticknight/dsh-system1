export type ErrorCode = 'unavailable' | 'unsupported' | 'limit_exceeded' | 'timeout' | 'cancelled' | 'provider_error' | 'invalid_response';
export interface DecisionError {
    readonly code: ErrorCode;
    readonly message: string;
    readonly retryable?: boolean | undefined;
    readonly httpStatus?: number | undefined;
}
/** Invalid caller input; no provider request has been sent. */
export declare class System1InputError extends Error {
    readonly name = "System1InputError";
}
/** A provider can report a classified, safe-to-display operational failure. */
export declare class System1ProviderError extends Error {
    readonly detail: DecisionError;
    readonly name = "System1ProviderError";
    constructor(detail: DecisionError);
}
//# sourceMappingURL=error.d.ts.map