import type {
  DecideImplementation,
  ModelCapabilities,
  ProviderModel,
  ProviderRequest,
  ProviderResponse,
} from '../contracts/provider.js'

export interface DecisionTransport {
  timeoutMs(): number
  describe(model: string, signal: AbortSignal): Promise<ModelCapabilities>
  evaluate(request: ProviderRequest, signal: AbortSignal): Promise<ProviderResponse>
}

/** The decision wire adapters retain their transport helpers; registration uses the operation contract. */
export function decisionImplementation<M extends ProviderModel>(
  models: readonly M[],
  capabilitiesFor: (model: M) => ModelCapabilities,
  transport: DecisionTransport,
  providerName: string,
): DecideImplementation & DecisionTransport {
  return {
    ...transport,
    version: 1,
    models: {
      kind: 'fixed',
      unknownModelMessage: `${providerName} model is not supported.`,
      models: models.map((model) => {
        const capabilities = capabilitiesFor(model)
        return {
          ...model,
          capabilities,
          inputs: [
            'text',
            ...(capabilities.images ? ['image'] : []),
            ...(capabilities.audio ? ['audio'] : []),
            ...(capabilities.videos ? ['video'] : []),
          ],
        }
      }),
    },
    execute: decisionExecutor((request, signal) => transport.evaluate(request, signal)),
  }
}

/** Execute with a bound transport, including an endpoint chosen for this attempt. */
export function decisionExecutor(evaluate: DecisionTransport['evaluate']): DecideImplementation['execute'] {
  return async (input, { model, requestId, signal }) => {
    const { model: executed, revision, ...result } = await evaluate({ ...input, model, requestId }, signal)
    return { model: executed, ...(revision !== undefined ? { revision } : {}), result }
  }
}
