import type { SettingsFormScope } from '@deepseek-ai/dsh-client-ui-primitives'
import { resolveOperationEnabled } from '../contracts/operation.js'
import type { OperationCatalogEntry, OperationRouteConfig } from '../contracts/operation.js'
import type { FallbackModelDraft } from './fallback-models.js'

type Values = Record<string, unknown>
type Model = FallbackModelDraft

export function values(value: unknown): Values {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Values : {}
}

/** Present one operation as a native settings form. The operation id is one
 * literal path component (including dots in extension ids), and the host
 * mutation changes only the fields edited in this form. */
export function routeScope(
  scope: SettingsFormScope<Values>,
  id: string,
  version: number,
): SettingsFormScope<Values> {
  const decide = id === 'decide'
  const prefix = ['operations', id]
  const read = (root: unknown) => {
    const operations = values(values(root).operations)
    return Object.hasOwn(operations, id) ? values(operations[id]) : {}
  }
  const address = (root: unknown): Values => {
    const route = read(root)
    if (!decide) return route
    const settings = values(root)
    return {
      ...(Object.hasOwn(settings, 'defaultModel') ? { defaultModel: settings.defaultModel } : {}),
      ...(Object.hasOwn(settings, 'fallbackModels') ? { fallbackModels: settings.fallbackModels } : {}),
      ...(Object.hasOwn(route, 'enabled') ? { enabled: route.enabled } : {}),
    }
  }
  const enabled = (root: unknown) => resolveOperationEnabled(id, read(root) as OperationRouteConfig)
  return {
    getSnapshot() {
      const snapshot = scope.getSnapshot()
      return {
        ...snapshot,
        value: snapshot.value === undefined ? undefined : { ...address(snapshot.value), enabled: enabled(snapshot.value) },
        base: address(snapshot.base),
        user: address(snapshot.user),
      }
    },
    subscribe: (listener) => scope.subscribe(listener),
    mutate(edits, revision) {
      if (!edits.length) return Promise.resolve(true)
      const patches = edits.map((edit) => decide && edit.path[0] !== 'enabled'
        ? edit
        : { ...edit, path: [...prefix, ...edit.path] })
      if (!decide && edits.some(({ path }) => path[0] === 'defaultModel' || path[0] === 'fallbackModels'))
        patches.push({ op: 'set', path: [...prefix, 'version'], value: version })
      const original = scope.getSnapshot().value
      if (!enabled(original) && read(original).enabled === undefined &&
        !edits.some(({ path }) => path[0] === 'enabled') &&
        edits.some((edit) => edit.op === 'set' && (
          edit.path[0] === 'defaultModel' ||
          (edit.path[0] === 'fallbackModels' && Array.isArray(edit.value) && edit.value.length > 0) ||
          (edit.path[0] === 'agentEnabled' && edit.value === true)
        ))) {
        // A legacy unversioned route implies enabled. Saving a new route while
        // its switch is off must not change that switch behind the user's back.
        patches.push({ op: 'set', path: [...prefix, 'enabled'], value: false })
      }
      return scope.mutate(patches, revision)
    },
  }
}

/** Resolve display capability without calling a model or a deployment probe. */
export function describeCandidate(entry: OperationCatalogEntry, ref: Model) {
  const provider = ref.provider.trim()
  const model = ref.model.trim()
  if (!provider || !model) return undefined
  const implementation = entry.providers.find((candidate) => candidate.id === provider)
  if (!implementation) return undefined
  const catalog = implementation.models
  if (catalog.kind === 'deployment') return { provider, model, inputs: catalog.inputs }
  const match = catalog.models.find((candidate) => candidate.id === model || candidate.aliases?.includes(model))
  return match && { provider, model: match.id, inputs: match.inputs }
}

export function previewRoute(entry: OperationCatalogEntry, route: readonly Model[]) {
  const seen = new Set<string>()
  const candidates = route.flatMap((ref) => {
    const candidate = describeCandidate(entry, ref)
    if (!candidate) return []
    const key = JSON.stringify([candidate.provider, candidate.model])
    if (seen.has(key)) return []
    seen.add(key)
    return [candidate]
  })
  return entry.inputKinds.map((input) => ({
    input,
    candidates: candidates.filter((candidate) => candidate.inputs.includes(input.id)),
  }))
}
