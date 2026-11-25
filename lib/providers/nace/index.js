import Schema from '@deepseek-ai/schemastery';
import { credentialRef, isCredentialRefName, } from '@deepseek-ai/dsh-credentials';
import { decideOperation, locateOperation } from '../../index.js';
import { createNaceProvider } from './adapter.js';
import { createNaceLocateProvider } from './locate.js';
export { createNaceProvider } from './adapter.js';
export { createNaceLocateProvider } from './locate.js';
export { NACE_MODELS } from './models.js';
export const inject = ['system1'];
export const Config = Schema.object({
    id: Schema.string().default('nace'),
    apiKeyEnv: Schema.string()
        .role('credential-ref')
        .pattern(/^[A-Za-z_][A-Za-z0-9_]*$/u)
        .default('NACE_API_KEY'),
    baseURL: Schema.string().default('https://console.nace.ai').volatile(),
    timeoutMs: Schema.number().min(1).max(2147483647).step(1).volatile(),
});
export function apply(ctx, config) {
    const logger = ctx.logger('dsh-system1 Nace provider');
    const options = {
        apiKey: '',
        resolveApiKey: async () => {
            const ref = config.apiKeyEnv;
            if (!isCredentialRefName(ref))
                return undefined;
            const credentials = ctx.get('credentials');
            if (credentials)
                return (await credentials.resolve(credentialRef(ref)))?.value;
            return process.env[ref];
        },
        resolveBaseURL: () => readConfigValue(config.baseURL),
        resolveTimeoutMs: () => readConfigValue(config.timeoutMs),
        warn: (message) => logger.warn(message),
    };
    const decide = createNaceProvider(options);
    const locate = createNaceLocateProvider(options);
    ctx.effect(() => ctx.system1.registerImplementation(decideOperation, config.id, decide));
    ctx.effect(() => ctx.system1.registerImplementation(locateOperation, config.id, locate));
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