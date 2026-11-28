/** The decision wire adapters retain their transport helpers; registration uses the operation contract. */
export function decisionImplementation(models, capabilitiesFor, transport, providerName) {
    return {
        ...transport,
        version: 1,
        models: {
            kind: 'fixed',
            unknownModelMessage: `${providerName} model is not supported.`,
            models: models.map((model) => {
                const capabilities = capabilitiesFor(model);
                return {
                    ...model,
                    capabilities,
                    inputs: [
                        'text',
                        ...(capabilities.images ? ['image'] : []),
                        ...(capabilities.audio ? ['audio'] : []),
                        ...(capabilities.videos ? ['video'] : []),
                    ],
                };
            }),
        },
        execute: decisionExecutor((request, signal) => transport.evaluate(request, signal)),
    };
}
/** Execute with a bound transport, including an endpoint chosen for this attempt. */
export function decisionExecutor(evaluate) {
    return async (input, { model, requestId, signal }) => {
        const { model: executed, revision, ...result } = await evaluate({ ...input, model, requestId }, signal);
        return { model: executed, ...(revision !== undefined ? { revision } : {}), result };
    };
}
//# sourceMappingURL=decision-implementation.js.map