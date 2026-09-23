import type { System1Provider } from '../contracts/provider.js';
export interface Registration {
    provider: System1Provider;
    controller: AbortController;
}
export declare class ProviderRegistry {
    private readonly entries;
    private disposed;
    register(id: string, provider: System1Provider): () => void;
    get(id: string): Registration | undefined;
    dispose(): void;
}
//# sourceMappingURL=registry.d.ts.map