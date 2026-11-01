import Schema from '@deepseek-ai/schemastery';
import { credentialRef, isCredentialRefName, } from '@deepseek-ai/dsh-credentials';
import { createMeraGptProvider } from './adapter.js';
export { createMeraGptProvider } from './adapter.js';
export { MERAGPT_MODELS } from './models.js';
export const inject = ['system1'];
export const Config = Schema.object({
    id: Schema.string().default('meragpt'),
    apiKeyEnv: Schema.string()
        .role('credential-ref')
        .pattern(/^[A-Za-z_][A-Za-z0-9_]*$/u)
        .default('MERAGPT_API_KEY'),
    baseURL: Schema.string().default('https://meragpt.com').volatile(),
    timeoutMs: Schema.number().min(1).max(2147483647).step(1).volatile(),
});
export function apply(ctx, config) {
    const provider = createMeraGptProvider({
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
    });
    ctx.effect(() => ctx.system1.registerProvider(config.id, provider));
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