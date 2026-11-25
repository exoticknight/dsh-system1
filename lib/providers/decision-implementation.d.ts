import type { DecideImplementation, ModelCapabilities, ProviderModel, ProviderRequest, ProviderResponse } from '../contracts/provider.js';
export interface DecisionTransport {
    timeoutMs(): number;
    describe(model: string, signal: AbortSignal): Promise<ModelCapabilities>;
    evaluate(request: ProviderRequest, signal: AbortSignal): Promise<ProviderResponse>;
}
/** The decision wire adapters retain their transport helpers; registration uses the operation contract. */
export declare function decisionImplementation<M extends ProviderModel>(models: readonly M[], capabilitiesFor: (model: M) => ModelCapabilities, transport: DecisionTransport, providerName: string): DecideImplementation & DecisionTransport;
//# sourceMappingURL=decision-implementation.d.ts.map