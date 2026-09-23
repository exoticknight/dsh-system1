/** Invalid caller input; no provider request has been sent. */
export class System1InputError extends Error {
    name = 'System1InputError';
}
/** A provider can report a classified, safe-to-display operational failure. */
export class System1ProviderError extends Error {
    detail;
    name = 'System1ProviderError';
    constructor(detail) {
        super(detail.message);
        this.detail = detail;
    }
}
//# sourceMappingURL=error.js.map