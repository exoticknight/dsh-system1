import type { Context } from '@deepseek-ai/cordis'
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import type { OperationCatalog } from './contracts/operation.js'
import { projectCatalog, SETTINGS_SERVICE, settingsHost } from './settings-wire.js'
import type { ProviderComponentBinding, SettingsCatalog } from './settings-wire.js'

interface Directory {
  getCatalog(): OperationCatalog
  subscribeCatalog(listener: () => void): () => void
}

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface TypertRegistryContract {
    register(contribution: typeof settingsHost): () => void | Promise<void>
  }
}

class SettingsBridge extends TypertRemoteService {
  static inject = ['typert']
  private readonly lifetime = new AbortController()

  constructor(ctx: Context, private readonly directory: Directory) {
    super(ctx, SETTINGS_SERVICE)
    ctx.effect(() => ctx.typert.register(settingsHost), 'dsh-system1 settings directory descriptor')
    ctx.effect(() => () => this.lifetime.abort(), 'dsh-system1 settings directory lifetime')
  }

  async *watch(signal: AbortSignal): AsyncGenerator<SettingsCatalog> {
    const done = AbortSignal.any([signal, this.lifetime.signal])
    let dirty = true
    let wake: (() => void) | undefined
    const changed = () => { dirty = true; wake?.() }
    const unsubscribe = this.directory.subscribeCatalog(changed)
    done.addEventListener('abort', changed, { once: true })
    try {
      while (!done.aborted) {
        if (!dirty) await new Promise<void>((resolve) => { wake = resolve })
        wake = undefined
        if (done.aborted) break
        dirty = false
        const directory = this.directory.getCatalog()
        const providerComponents = loadedProviderComponents(this.ctx)
        yield projectCatalog(providerComponents.length ? { ...directory, providerComponents } : directory)
      }
    } finally {
      unsubscribe()
      done.removeEventListener('abort', changed)
    }
  }
}

/** The Host's settings mirror only carries editable fields. Resolve the immutable
 * instance id and credential reference from the exact Loader entry instead. */
function loadedProviderComponents(ctx: Context): ProviderComponentBinding[] {
  const loader = ctx.get('loader') as { entries(): Iterable<{
    id: string
    disabled?: boolean
    options: { id: string; name: string }
    fiber?: { config: unknown }
  }> } | undefined
  if (!loader) return []
  const bindings = new Map<string, ProviderComponentBinding>()
  for (const entry of loader.entries()) {
    if (entry.disabled) continue
    const moduleName = entry.options.name
    if (!/^dsh-system1\/providers\/(?:typesafe|laya|meragpt|liquid|nace|cloudflare)$/u.test(moduleName)) continue
    const config = entry.fiber?.config
    if (!config || typeof config !== 'object') continue
    const { id, apiKeyEnv } = config as Record<string, unknown>
    if (typeof id !== 'string' || id.length === 0 || typeof apiKeyEnv !== 'string' ||
      !/^[A-Za-z_][A-Za-z0-9_]*$/u.test(apiKeyEnv)) continue
    // The Loader can visit an entry through both the mounted include and its
    // tree. Its qualified ID is unique; DSH's row config uses the local row ID.
    bindings.set(entry.id, { rowId: entry.options.id, moduleName, providerId: id, keyRef: apiKeyEnv })
  }
  const candidates = [...bindings.values()]
  return candidates.filter(({ rowId, moduleName, providerId }) =>
    rowId === `system1-${moduleName.split('/').at(-1)}` &&
    candidates.filter((candidate) => candidate.rowId === rowId ||
      candidate.providerId === providerId).length === 1)
}

export function installSettingsBridge(ctx: Context, directory: Directory): void {
  void ctx.plugin(SettingsBridge, directory)
}
