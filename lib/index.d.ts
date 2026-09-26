import { Service, type Context, type Volatile } from '@deepseek-ai/cordis';
import Schema from '@deepseek-ai/schemastery';
import type { DecideRequest, ModelRef, Questions, System1Options, System1Provider } from './contracts/index.js';
export type * from './contracts/index.js';
export { System1InputError, System1ProviderError } from './contracts/error.js';
declare module '@deepseek-ai/cordis' {
    interface Context {
        system1: System1Service;
    }
}
export default class System1Service extends Service {
    static Config: Schema<System1Options, System1Config>;
    private readonly engine;
    constructor(ctx: Context, config?: System1Config | System1Options);
    decide<const Q extends Questions>(request: DecideRequest<Q>): Promise<import("./contracts/request.js").DecideResponse<Q>>;
    registerProvider(id: string, provider: System1Provider): () => void;
}
interface System1Config {
    defaultModel: Volatile<ModelRef | undefined>;
    timeoutMs: Volatile<number>;
}
//# sourceMappingURL=index.d.ts.map