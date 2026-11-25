import { System1InputError } from '../contracts/error.js'
import { operationIdPattern } from '../contracts/operation.js'
import type {
  OperationDefinition,
  OperationImplementation,
  OperationModel,
  OperationModels,
} from '../contracts/operation.js'

export interface Registration<I, O, C> {
  readonly provider: OperationImplementation<I, O, C>
  readonly controller: AbortController
  readonly warn?: (message: string) => void
  warnedInvalidCapabilities: boolean
}

interface OperationRegistration<I, O, C> {
  readonly definition: OperationDefinition<I, O, C>
  readonly implementations: Map<string, Registration<I, O, C>>
  readonly controller: AbortController
}

type ErasedOperation = OperationRegistration<unknown, unknown, unknown>
export class OperationRegistry {
  private readonly operations = new Map<string, ErasedOperation>()
  private readonly listeners = new Set<() => void>()
  disposed = false

  registerOperation<I, O, C>(definition: OperationDefinition<I, O, C>): () => void {
    this.assertActive()
    if (!operationIdPattern.test(definition.id)
      || !Number.isSafeInteger(definition.version) || definition.version < 1
      || !definition.title.trim() || typeof definition.parseInput !== 'function'
      || typeof definition.parseOutput !== 'function' || typeof definition.checkCapabilities !== 'function')
      throw new System1InputError('An operation needs a stable ID, major version, title and validators.')
    const inputs = definition.inputKinds.map(({ id }) => id)
    if (!inputs.length || inputs.some((id) => !operationIdPattern.test(id)) || new Set(inputs).size !== inputs.length)
      throw new System1InputError('An operation needs unique input kind IDs.')
    if (this.operations.has(definition.id))
      throw new System1InputError(`Operation already registered: ${definition.id}`)
    const toolName = definition.tool?.name
    if (toolName && (toolName === 'system1_decide'
      || [...this.operations.values()].some(({ definition }) => definition.tool?.name === toolName)))
      throw new System1InputError(`Operation tool already registered: ${toolName}`)
    const entry = {
      definition,
      implementations: new Map(),
      controller: new AbortController(),
    }
    this.operations.set(definition.id, entry as unknown as ErasedOperation)
    this.changed()
    return () => {
      if (this.operations.get(definition.id) !== entry) return
      this.operations.delete(definition.id)
      this.retire(entry)
      this.changed()
    }
  }

  registerImplementation<I, O, C>(
    operation: OperationDefinition<I, O, C>,
    id: string,
    implementation: OperationImplementation<NoInfer<I>, NoInfer<O>, NoInfer<C>>,
    warn?: (message: string) => void,
  ): () => void {
    this.assertActive()
    const owner = this.get(operation)
    if (!owner) throw new System1InputError(`Operation is not registered: ${operation.id}`)
    if (implementation.version !== operation.version)
      throw new System1InputError(`Incompatible implementation major version for ${operation.id}.`)
    if (!id.trim() || typeof implementation.timeoutMs !== 'function' || typeof implementation.execute !== 'function')
      throw new System1InputError('An implementation needs a provider ID and timeoutMs and execute methods.')
    if (owner.implementations.has(id))
      throw new System1InputError(`Implementation already registered: ${operation.id}/${id}`)
    const entry = {
      provider: {
        version: implementation.version,
        models: snapshotModels(implementation.models, operation.inputKinds.map(({ id }) => id)),
        timeoutMs: implementation.timeoutMs.bind(implementation),
        execute: implementation.execute.bind(implementation),
      },
      controller: new AbortController(),
      ...(warn ? { warn } : {}),
      warnedInvalidCapabilities: false,
    }
    owner.implementations.set(id, entry)
    this.changed()
    return () => {
      if (owner.implementations.get(id) !== entry) return
      owner.implementations.delete(id)
      entry.controller.abort()
      this.changed()
    }
  }

  get<I, O, C>(definition: OperationDefinition<I, O, C>): OperationRegistration<I, O, C> | undefined {
    const stored = this.operations.get(definition.id)
    if (stored?.definition !== definition as unknown) return undefined
    return stored as unknown as OperationRegistration<I, O, C>
  }

  entries(): Iterable<ErasedOperation> {
    return this.operations.values()
  }

  subscribe(listener: () => void): () => void {
    this.assertActive()
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  changed(): void {
    for (const listener of [...this.listeners]) {
      try { listener() } catch { /* Observers cannot change registration or config outcomes. */ }
    }
  }

  dispose(): void {
    this.disposed = true
    const entries = [...this.operations.values()]
    this.operations.clear()
    for (const entry of entries) this.retire(entry)
    this.changed()
    this.listeners.clear()
  }

  private assertActive(): void {
    if (this.disposed) throw new System1InputError('System1 service has been disposed.')
  }

  private retire<I, O, C>(entry: OperationRegistration<I, O, C>): void {
    entry.controller.abort()
    const implementations = [...entry.implementations.values()]
    entry.implementations.clear()
    for (const implementation of implementations) implementation.controller.abort()
  }
}

function snapshotModels<C>(models: OperationModels<C>, allInputs: readonly string[]): OperationModels<C> {
  const checkInputs = (inputs: readonly string[]) => {
    if (!inputs.length || inputs.some((id) => !allInputs.includes(id)) || new Set(inputs).size !== inputs.length)
      throw new System1InputError('An implementation must declare supported operation input kinds.')
    return [...inputs]
  }
  if (models?.kind === 'deployment' && typeof models.resolve === 'function')
    return { kind: 'deployment', inputs: checkInputs(models.inputs), resolve: models.resolve.bind(models) }
  if (models?.kind !== 'fixed' || !models.models.length)
    throw new System1InputError('An implementation needs a fixed model catalog or a deployment resolver.')
  const keys = new Set<string>()
  return {
    kind: 'fixed',
    ...(models.unknownModelMessage ? { unknownModelMessage: models.unknownModelMessage } : {}),
    models: models.models.map(({ id, aliases, inputs, capabilities }) => {
      for (const key of [id, ...(aliases ?? [])]) {
        if (!key.trim() || keys.has(key))
          throw new System1InputError('Implementation model IDs and aliases must be nonempty and unique.')
        keys.add(key)
      }
      return { id, ...(aliases ? { aliases: [...aliases] } : {}), inputs: checkInputs(inputs), capabilities }
    }),
  }
}

export function findFixedModel<C>(models: OperationModels<C>, name: string): OperationModel<C> | undefined {
  return models.kind === 'fixed'
    ? models.models.find(({ id, aliases }) => id === name || aliases?.includes(name))
    : undefined
}
