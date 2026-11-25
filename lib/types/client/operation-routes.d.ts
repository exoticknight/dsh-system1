import type { SettingsFormScope } from '@deepseek-ai/dsh-client-ui-primitives';
import type { OperationCatalogEntry } from '../contracts/operation.js';
import type { FallbackModelDraft } from './fallback-models.js';
type Values = Record<string, unknown>;
type Model = FallbackModelDraft;
export declare function values(value: unknown): Values;
/** Present one operation as a native settings form. The operation id is one
 * literal path component (including dots in extension ids), and the host
 * mutation changes only the fields edited in this form. */
export declare function routeScope(scope: SettingsFormScope<Values>, id: string, version: number): SettingsFormScope<Values>;
/** Resolve display capability without calling a model or a deployment probe. */
export declare function describeCandidate(entry: OperationCatalogEntry, ref: Model): {
    provider: string;
    model: string;
    inputs: readonly string[];
} | undefined;
export declare function previewRoute(entry: OperationCatalogEntry, route: readonly Model[]): {
    input: import("../contracts/operation.js").OperationInputKind;
    candidates: {
        provider: string;
        model: string;
        inputs: readonly string[];
    }[];
}[];
export {};
