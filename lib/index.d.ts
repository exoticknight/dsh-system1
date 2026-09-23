import { Service, type Context } from '@deepseek-ai/cordis';
import Schema from '@deepseek-ai/schemastery';
import type { DecideRequest, Questions, System1Options, System1Provider } from './contracts/index.js';
export type * from './contracts/index.js';
export { System1InputError, System1ProviderError } from './contracts/error.js';
declare module '@deepseek-ai/cordis' {
    interface Context {
        system1: System1Service;
    }
}
export default class System1Service extends Service {
    static Config: Schema<System1Options>;
    private readonly engine;
    constructor(ctx: Context, config?: System1Options);
    decide<const Q extends Questions>(request: DecideRequest<Q>): Promise<import("./contracts/request.js").DecideResponse<Q>>;
    registerProvider(id: string, provider: System1Provider): () => void;
}
//# sourceMappingURL=index.d.ts.map