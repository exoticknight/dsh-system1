import type { System1Provider } from '../contracts/provider.js';
export interface Registration {
    provider: System1Provider;
    controller: AbortController;
    warn?: (message: string) => void;
    warnedInvalidCapabilities: boolean;
}
export declare class ProviderRegistry {
    private readonly entries;
    private disposed;
    register(id: string, provider: System1Provider, warn?: (message: string) => void): () => void;
    get(id: string): Registration | undefined;
    dispose(): void;
}
//# sourceMappingURL=registry.d.ts.map