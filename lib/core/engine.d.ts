import type { DecideRequest, DecideResponse, System1Options } from '../contracts/request.js';
import type { Questions } from '../contracts/question.js';
import type { System1Provider } from '../contracts/provider.js';
export declare class System1Engine {
    private readonly registry;
    private readonly resolveOptions;
    constructor(options?: System1Options | (() => System1Options));
    private validateOptions;
    registerProvider(id: string, provider: System1Provider): () => void;
    dispose(): void;
    decide<const Q extends Questions>(input: DecideRequest<Q>): Promise<DecideResponse<Q>>;
}
//# sourceMappingURL=engine.d.ts.map