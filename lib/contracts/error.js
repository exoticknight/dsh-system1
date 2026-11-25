/** Invalid caller input; no provider request has been sent. */
export class System1InputError extends Error {
    name = 'System1InputError';
}
/** The operation is disabled in this service; no provider request has been sent. */
export class System1OperationDisabledError extends Error {
    operationId;
    name = 'System1OperationDisabledError';
    constructor(operationId) {
        super(`System1 operation is disabled: ${operationId}.`);
        this.operationId = operationId;
    }
}
/** A provider can report a classified, safe-to-display operational failure. */
export class System1ProviderError extends Error {
    detail;
    disposition;
    requestSent;
    name = 'System1ProviderError';
    /**
     * @param disposition For new operations, whether sending the input to another configured model is safe.
     * @param requestSent Set false if the input was not sent (for example, a missing credential).
     */
    constructor(detail, disposition = 'stop', requestSent) {
        super(detail.message);
        this.detail = detail;
        this.disposition = disposition;
        this.requestSent = requestSent;
    }
}
//# sourceMappingURL=error.js.map