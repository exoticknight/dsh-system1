import type { System1Provider } from '../contracts/provider.js'
import { System1InputError } from '../contracts/error.js'
export interface Registration {
  provider: System1Provider
  controller: AbortController
}
export class ProviderRegistry {
  private readonly entries = new Map<string, Registration>()
  private disposed = false
  register(id: string, provider: System1Provider): () => void {
    if (this.disposed)
      throw new System1InputError('System1 service has been disposed.')
    if (
      !id.trim() ||
      typeof provider.describe !== 'function' ||
      typeof provider.evaluate !== 'function'
    )
      throw new System1InputError(
        'A provider needs a nonempty id, describe and evaluate.',
      )
    if (this.entries.has(id))
      throw new System1InputError(`Provider already registered: ${id}`)
    const entry = { provider, controller: new AbortController() }
    this.entries.set(id, entry)
    return () => {
      if (this.entries.get(id) !== entry) return
      this.entries.delete(id)
      entry.controller.abort()
    }
  }
  get(id: string): Registration | undefined {
    return this.entries.get(id)
  }
  dispose(): void {
    this.disposed = true
    const entries = [...this.entries.values()]
    this.entries.clear()
    for (const entry of entries) entry.controller.abort()
  }
}
