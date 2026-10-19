import type { ProviderModel } from '../contracts/provider.js';
/** Resolve a provider-owned model definition by its canonical ID or alias. */
export declare function findProviderModel<const Models extends readonly ProviderModel[]>(models: Models, model: string): Models[number] | undefined;
//# sourceMappingURL=models.d.ts.map