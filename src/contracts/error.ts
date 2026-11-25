export type ErrorCode =
  | 'unavailable'
  | 'unsupported'
  | 'limit_exceeded'
  | 'timeout'
  | 'cancelled'
  | 'provider_error'
  | 'invalid_response'
export interface DecisionError {
  readonly code: ErrorCode
  readonly message: string
  readonly retryable?: boolean | undefined
  readonly httpStatus?: number | undefined
}

/** Invalid caller input; no provider request has been sent. */
export class System1InputError extends Error {
  override readonly name = 'System1InputError'
}

/** The operation is disabled in this service; no provider request has been sent. */
export class System1OperationDisabledError extends Error {
  override readonly name = 'System1OperationDisabledError'
  constructor(readonly operationId: string) {
    super(`System1 operation is disabled: ${operationId}.`)
  }
}

/** A provider can report a classified, safe-to-display operational failure. */
export class System1ProviderError extends Error {
  override readonly name = 'System1ProviderError'
  /**
   * @param disposition For new operations, whether sending the input to another configured model is safe.
   * @param requestSent Set false if the input was not sent (for example, a missing credential).
   */
  constructor(
    readonly detail: DecisionError,
    readonly disposition: 'fallback' | 'stop' = 'stop',
    readonly requestSent?: false,
  ) {
    super(detail.message)
  }
}
