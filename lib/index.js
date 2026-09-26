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
        ]).volatile(),
        timeoutMs: Schema.number()
            .min(1)
            .max(2147483647)
            .step(1)
            .default(800)
            .volatile(),
    });
    engine;
    constructor(ctx, config = {}) {
        super(ctx, 'system1');
        this.engine = new System1Engine(() => {
            const defaultModel = readConfigValue(config.defaultModel);
            const timeoutMs = readConfigValue(config.timeoutMs);
            return {
                ...(defaultModel !== undefined ? { defaultModel } : {}),
                ...(timeoutMs !== undefined ? { timeoutMs } : {}),
            };
        });
        ctx.effect(() => () => this.engine.dispose());
    }
    decide(request) {
        return this.engine.decide(request);
    }
    registerProvider(id, provider) {
        return this.engine.registerProvider(id, provider);
    }
}
function readConfigValue(value) {
    if (value !== null &&
        typeof value === 'object' &&
        'get' in value &&
        typeof value.get === 'function')
        return value.get();
    return value;
}
//# sourceMappingURL=index.js.map