import type { ProviderModel } from '../contracts/provider.js'

/** Resolve a provider-owned model definition by its canonical ID or alias. */
export function findProviderModel<const Models extends readonly ProviderModel[]>(
  models: Models,
  model: string,
): Models[number] | undefined {
  return models.find(
    (entry) => entry.id === model || entry.aliases?.includes(model),
  )
}
