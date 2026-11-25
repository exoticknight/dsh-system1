import type { OperationCatalogEntry } from '../contracts/operation.js';
import type { ProviderComponentBinding } from '../settings-wire.js';
/** Cordis entry id, runtime provider id and credential reference are independent. */
export declare function providerComponent(components: readonly ProviderComponentBinding[] | undefined, rowId: string, moduleName: string): ProviderComponentBinding | undefined;
type SavedRoutePosition = {
    kind: 'primary';
} | {
    kind: 'fallback';
    index: number;
};
export declare function providerModels(entries: readonly OperationCatalogEntry[], instanceId: string): Map<string, {
    entry: OperationCatalogEntry;
    inputs: readonly string[];
    positions: readonly SavedRoutePosition[];
}[]>;
export {};
