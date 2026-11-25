import { randomUUID } from 'node:crypto'
import { System1InputError, System1OperationDisabledError, System1ProviderError } from '../contracts/error.js'
import type { DecisionError } from '../contracts/error.js'
import { resolveOperationEnabled } from '../contracts/operation.js'
import type {
  OperationAttempt,
  OperationCatalog,
  OperationCatalogEntry,
  OperationDefinition,
  OperationResult,
  OperationRunOptions,
  RegisteredOperationTool,
} from '../contracts/operation.js'
import type { ModelRef, System1Options } from '../contracts/request.js'
import { execute } from './execution.js'
import { findFixedModel, OperationRegistry } from './registry.js'
import { errorSchema, modelSchema, timeoutSchema } from './validation.js'

const missingProvider: DecisionError = {
  code: 'unavailable',
  message: 'Requested implementation is not registered.',
}
const unsupported: DecisionError = {
  code: 'unsupported',
  message: 'Model does not support the requested operation or input kind.',
}
const cancelled: DecisionError = {
  code: 'cancelled',
  message: 'Operation cancelled.',
}

export class OperationRuntime {
  readonly registry = new OperationRegistry()

  constructor(private readonly resolveOptions: () => System1Options) {}

  isOperationEnabled(id: string, options = this.resolveOptions()): boolean {
    return resolveOperationEnabled(id, operationConfig(id, options))
  }

  assertOperationEnabled(id: string, options = this.resolveOptions()): void {
    if (!this.isOperationEnabled(id, options)) throw new System1OperationDisabledError(id)
  }

  getCatalog(mountedTools: ReadonlySet<string>, decisionToolAttached: boolean): OperationCatalog {
    const config = this.resolveOptions()
    return structuredClone({
      operations: Array.from(this.registry.entries(), ({ definition, implementations }) => ({
        id: definition.id,
        version: definition.version,
        title: definition.title,
        ...(definition.description ? { description: definition.description } : {}),
        ...(definition.translations ? {
          translations: Object.fromEntries(Object.entries(definition.translations).map(([locale, { title, description }]) => [
            locale, { title, ...(description !== undefined ? { description } : {}) },
          ])),
        } : {}),
        inputKinds: definition.inputKinds.map(({ id, title, translations }) => ({
          id, title, ...(translations ? { translations } : {}),
        })),
        ...(definition.id === 'decide'
          ? { tool: { name: 'system1_decide', description: 'Ask the decision models for structured judgments.' } }
          : definition.tool ? { tool: { name: definition.tool.name, description: definition.tool.description } } : {}),
        route: this.route(definition, config, decisionToolAttached),
        agentAvailable: definition.id === 'decide'
          ? this.isOperationEnabled(definition.id, config) && mountedTools.has('system1_decide')
          : !!definition.tool && mountedTools.has(definition.tool.name) && this.isAgentRouteAvailable(definition, config),
        providers: Array.from(implementations, ([id, { provider }]) => ({
          id,
          models: provider.models.kind === 'deployment'
            ? { kind: 'deployment' as const, inputs: provider.models.inputs }
            : {
                kind: 'fixed' as const,
                models: provider.models.models.map(({ id, aliases, inputs }) => ({
                  id, ...(aliases ? { aliases } : {}), inputs,
                })),
              },
        })),
      })),
    })
  }

  getAgentTools(): readonly RegisteredOperationTool[] {
    const config = this.resolveOptions()
    return Array.from(this.registry.entries()).flatMap((entry) => {
      const { definition } = entry
      const tool = definition.tool
      if (!tool || !this.isAgentRouteAvailable(definition, config)) return []
      return [{
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        ...(tool.output ? { output: tool.output } : {}),
        execute: async (args: unknown, signal: AbortSignal) => {
          this.assertOperationEnabled(definition.id)
          if (this.registry.get(definition) !== entry || !this.isAgentRouteAvailable(definition, this.resolveOptions()))
            throw new System1InputError('This operation is no longer enabled for the agent.')
          const result = await this.run(definition, tool.toInput ? tool.toInput(args) : args, { signal })
          return tool.toOutput ? tool.toOutput(result) : result
        },
      }]
    })
  }

  async run<I, O, C>(
    operation: OperationDefinition<I, O, C>,
    input: I,
    options: OperationRunOptions = {},
  ): Promise<OperationResult<O>> {
    const start = performance.now()
    const requestId = randomUUID()
    const entry = this.registry.get(operation)
    if (!entry) throw new System1InputError(`Operation is not registered: ${operation.id}`)
    const definition = entry.definition
    const config = this.resolveOptions()
    this.assertOperationEnabled(definition.id, config)
    let parsed: I
    let inputKind: string | undefined
    try {
      parsed = structuredClone(definition.parseInput(input))
      inputKind = definition.getInputKind?.(parsed)
      if (inputKind !== undefined && !definition.inputKinds.some(({ id }) => id === inputKind))
        throw new System1InputError('Input kind is not part of the operation contract.')
    } catch (error) {
      if (error instanceof System1InputError) throw error
      throw new System1InputError(`Invalid input for ${definition.id}.`)
    }
    if (options.model !== undefined && !modelSchema.safeParse(options.model).success)
      throw new System1InputError('Invalid explicit model.')
    if (options.timeoutMs !== undefined && !timeoutSchema.safeParse(options.timeoutMs).success)
      throw new System1InputError('Invalid operation timeout.')
    if (options.signal !== undefined && !(options.signal instanceof AbortSignal))
      throw new System1InputError('Invalid operation abort signal.')
    const { signal, timeoutMs } = options
    const route = this.route(definition, config)
    const chain = options.model
      ? [{ ...options.model }]
      : route.compatible ? modelChain(route.defaultModel, route.fallbackModels) : []
    const requested = chain[0]
    const attempts: OperationAttempt[] = []
    const signalAborted = () => signal?.aborted === true || entry.controller.signal.aborted
    const meta = () => ({
      requestId,
      ...(requested ? { requested } : {}),
      attempts,
      durationMs: performance.now() - start,
    })
    const failure = (error: DecisionError, reason: Extract<OperationResult<O>, { status: 'error' }>['reason']): OperationResult<O> =>
      ({ status: 'error', error, reason, meta: meta() })
    if (signalAborted()) return failure(cancelled, 'cancelled')
    if (!requested)
      return failure({
        code: 'unavailable',
        message: `Select a model or configure a compatible route for ${definition.id}.`,
      }, 'no_applicable_model')
    let lastError: DecisionError = missingProvider
    let lastExecutedError: DecisionError | undefined
    const aliasesSeen = new Map<string, Set<string>>()
    for (const model of chain) {
      if (signalAborted()) return failure(cancelled, 'cancelled')
      const registered = entry.implementations.get(model.provider)
      const skip = (error: DecisionError) => {
        lastError = error
        attempts.push({ ...model, kind: 'skipped', error: { code: error.code, message: error.message } })
      }
      if (!registered) { skip(missingProvider); continue }
      const provider = registered.provider
      const fixedModel = findFixedModel(provider.models, model.model)
      if (provider.models.kind === 'fixed' && !fixedModel) {
        skip(provider.models.unknownModelMessage ? { ...unsupported, message: provider.models.unknownModelMessage } : unsupported)
        continue
      }
      const declared = provider.models.kind === 'deployment' ? provider.models.inputs : fixedModel!.inputs
      if (inputKind !== undefined && !declared.includes(inputKind)) { skip(unsupported); continue }
      if (fixedModel) {
        const seen = aliasesSeen.get(model.provider) ?? new Set<string>()
        if (seen.has(fixedModel.id)) continue
        seen.add(fixedModel.id)
        aliasesSeen.set(model.provider, seen)
      }
      let sent = false
      // A failed deployment resolver may have contacted its control plane, but it never received input.
      try {
        const budget = timeoutMs ?? provider.timeoutMs()
        if (!timeoutSchema.safeParse(budget).success) {
          skip({ code: 'invalid_response', message: 'Implementation returned an invalid timeout.' })
          continue
        }
        const result = await execute(
          [entry.controller.signal, registered.controller.signal, ...(signal ? [signal] : [])],
          budget,
          async (attemptSignal) => {
            const selected = provider.models.kind === 'deployment'
              ? await provider.models.resolve(model.model, attemptSignal)
              : fixedModel!
            if (!selected || typeof selected.id !== 'string' || !selected.id.trim() || !Array.isArray(selected.inputs))
              throw new System1ProviderError({ code: 'invalid_response', message: 'Implementation returned an invalid model.' }, 'fallback')
            if (inputKind !== undefined && !selected.inputs.includes(inputKind))
              throw new System1ProviderError(unsupported, 'fallback')
            const limitation = definition.checkCapabilities(parsed, selected.capabilities)
            if (limitation) throw new System1ProviderError(limitation, 'fallback')
            attemptSignal.throwIfAborted()
            const attemptInput = structuredClone(parsed)
            sent = true
            const response = await provider.execute(attemptInput, { model: selected.id, requestId, signal: attemptSignal })
            attemptSignal.throwIfAborted()
            try {
              if (!response || typeof response.model !== 'string' || !response.model.trim()
                || (response.revision !== undefined && (typeof response.revision !== 'string' || !response.revision.trim())))
                throw new TypeError('Invalid model metadata')
              const value = definition.parseOutput(response.result, parsed)
              return { value, model: response.model, ...(response.revision ? { revision: response.revision } : {}) }
            } catch {
              throw new System1ProviderError({
                code: 'invalid_response',
                message: 'Implementation returned an invalid operation result.',
              }, 'fallback')
            }
          },
          'Operation',
        )
        if (signalAborted() || registered.controller.signal.aborted)
          throw new System1ProviderError(cancelled)
        attempts.push({ ...model, kind: 'executed' })
        return {
          status: 'ok',
          value: result.value,
          meta: {
            ...meta(),
            executed: { provider: model.provider, model: result.model, ...(result.revision ? { revision: result.revision } : {}) },
          },
        }
      } catch (error) {
        if (error instanceof System1ProviderError && error.requestSent === false) sent = false
        if (signalAborted() || registered.controller.signal.aborted || (error instanceof System1ProviderError && error.detail.code === 'cancelled')) {
          attempts.push({ ...model, kind: sent ? 'executed' : 'skipped', error: cancelled })
          return failure(cancelled, 'cancelled')
        }
        const detail = error instanceof System1ProviderError ? errorSchema.safeParse(error.detail) : undefined
        lastError = detail?.success ? detail.data : { code: 'provider_error', message: 'Operation implementation failed.' }
        if (sent) lastExecutedError = lastError
        attempts.push({ ...model, kind: sent ? 'executed' : 'skipped', error: { code: lastError.code, message: lastError.message } })
        if (!(detail?.success && error instanceof System1ProviderError && error.disposition === 'fallback'))
          return lastExecutedError
            ? failure(lastError, 'upstream_execution_failed')
            : failure(lastError, 'no_applicable_model')
      }
    }
    return lastExecutedError
      ? failure(lastExecutedError, 'upstream_execution_failed')
      : failure(lastError, 'no_applicable_model')
  }

  private route<I, O, C>(
    { id, version }: OperationDefinition<I, O, C>,
    options = this.resolveOptions(),
    decisionToolAttached = false,
  ): OperationCatalogEntry['route'] {
    const stored = id === 'decide'
      ? { defaultModel: options.defaultModel, fallbackModels: options.fallbackModels, agentEnabled: decisionToolAttached, version: 1 }
      : operationConfig(id, options)
    const storedVersion = stored?.version ?? 1
    const reference = ({ provider, model }: ModelRef) => ({ provider, model })
    return {
      enabled: this.isOperationEnabled(id, options),
      version: storedVersion,
      compatible: storedVersion === version,
      ...(stored?.defaultModel ? { defaultModel: reference(stored.defaultModel) } : {}),
      fallbackModels: stored?.fallbackModels?.map(reference) ?? [],
      agentEnabled: stored?.agentEnabled === true,
    }
  }

  private isAgentRouteAvailable<I, O, C>(definition: OperationDefinition<I, O, C>, options: System1Options): boolean {
    const route = this.route(definition, options)
    if (!route.enabled || !route.compatible || !route.agentEnabled || !route.defaultModel) return false
    const models = this.registry.get(definition)?.implementations.get(route.defaultModel.provider)?.provider.models
    return !!models && (models.kind === 'deployment'
      ? route.defaultModel.model.trim().length > 0
      : !!findFixedModel(models, route.defaultModel.model))
  }
}

function operationConfig(id: string, options: System1Options) {
  return Object.hasOwn(options.operations ?? {}, id) ? options.operations?.[id] : undefined
}

export function modelChain(defaultModel: ModelRef | undefined, fallbackModels: readonly ModelRef[]): ModelRef[] {
  const seen = new Set<string>()
  return (defaultModel ? [defaultModel, ...fallbackModels] : fallbackModels).flatMap((candidate) => {
    const key = JSON.stringify([candidate.provider, candidate.model])
    if (seen.has(key)) return []
    seen.add(key)
    return [{ ...candidate }]
  })
}
