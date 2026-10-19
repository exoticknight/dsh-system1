/** Resolve a provider-owned model definition by its canonical ID or alias. */
export function findProviderModel(models, model) {
    return models.find((entry) => entry.id === model || entry.aliases?.includes(model));
}
//# sourceMappingURL=models.js.map