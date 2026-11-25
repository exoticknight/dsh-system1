export const operationIdPattern = /^(?!(?:constructor|prototype)$)[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/u;
export function defineOperation(definition) {
    return Object.freeze({ ...definition });
}
export function resolveOperationEnabled(id, stored) {
    // Keep existing routes active; unconfigured new operations start off.
    return stored?.enabled ?? (id === 'decide' || !!stored?.defaultModel
        || !!stored?.fallbackModels?.length || stored?.agentEnabled === true);
}
//# sourceMappingURL=operation.js.map