import type { System1Provider } from '../../contracts/index.js';
export interface TypesafeOptions {
    apiKey: string;
    baseURL?: string;
    fetch?: typeof fetch;
}
export declare function createTypesafeProvider(options: TypesafeOptions): System1Provider;
//# sourceMappingURL=adapter.d.ts.map