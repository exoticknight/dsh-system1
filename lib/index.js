import { Service } from '@deepseek-ai/cordis';
import Schema from '@deepseek-ai/schemastery';
import { System1Engine } from './core/engine.js';
export { System1InputError, System1ProviderError } from './contracts/error.js';
export default class System1Service extends Service {
    static Config = Schema.object({
        defaultModel: Schema.union([
            Schema.const(undefined),
            Schema.object({
                provider: Schema.string().required(),
                model: Schema.string().required(),
            }),
        ]),
        timeoutMs: Schema.number().min(1).max(2147483647).step(1).default(800),
    });
    engine;
    constructor(ctx, config = {}) {
        super(ctx, 'system1');
        this.engine = new System1Engine(config);
        ctx.effect(() => () => this.engine.dispose());
    }
    decide(request) {
        return this.engine.decide(request);
    }
    registerProvider(id, provider) {
        return this.engine.registerProvider(id, provider);
    }
}
//# sourceMappingURL=index.js.map