import type { OperationCatalogEntry } from '../contracts/operation.js'
import type { ProviderComponentBinding } from '../settings-wire.js'
import { describeCandidate } from './operation-routes.js'

/** Cordis entry id, runtime provider id and credential reference are independent. */
export function providerComponent(
  components: readonly ProviderComponentBinding[] | undefined,
  rowId: string,
  moduleName: string,
) {
  const matches = components?.filter((item) => item.rowId === rowId && item.moduleName === moduleName)
  const binding = matches?.length === 1 ? matches[0] : undefined
  return binding && components?.filter((item) => item.providerId === binding.providerId).length === 1
    ? binding : undefined
}

type SavedRoutePosition = { kind: 'primary' } | { kind: 'fallback'; index: number }

export function providerModels(entries: readonly OperationCatalogEntry[], instanceId: string) {
  const models = new Map<string, { entry: OperationCatalogEntry; inputs: readonly string[]; positions: readonly SavedRoutePosition[] }[]>()
  for (const entry of entries) {
    const manifest = entry.providers.find(({ id }) => id === instanceId)?.models
    if (!manifest) continue
    const saved = new Map<string, SavedRoutePosition[]>()
    // Keep the position in the complete saved route, even when the preceding
    // fallback belongs to another provider or does not support the same input.
    const chain = [entry.route.defaultModel, ...entry.route.fallbackModels]
    for (const [index, ref] of chain.entries()) {
      if (ref?.provider !== instanceId) continue
      const match = describeCandidate(entry, ref)
      if (!match) continue
      const position: SavedRoutePosition = index === 0 ? { kind: 'primary' } : { kind: 'fallback', index }
      saved.set(match.model, [...saved.get(match.model) ?? [], position])
    }
    const registered = manifest.kind === 'fixed' ? manifest.models : [
      { id: '', inputs: manifest.inputs },
      ...[...saved.keys()].map((id) => ({ id, inputs: manifest.inputs })),
    ]
    for (const model of registered) {
      const usage = { entry, inputs: model.inputs, positions: saved.get(model.id) ?? [] }
      models.set(model.id, [...models.get(model.id) ?? [], usage])
    }
  }
  return models
}
