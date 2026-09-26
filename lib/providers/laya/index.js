import Schema from '@deepseek-ai/schemastery';
import { credentialRef, isCredentialRefName, } from '@deepseek-ai/dsh-credentials';
import { createLayaProvider } from './adapter.js';
export { createLayaProvider } from './adapter.js';
export const inject = ['system1'];
export const Config = Schema.object({
    id: Schema.string().default('laya'),
    apiKeyEnv: Schema.string()
        .role('credential-ref')
        .pattern(/^[A-Za-z_][A-Za-z0-9_]*$/u)
        .default('LAYA_API_KEY'),
    baseURL: Schema.string().default('http://127.0.0.1:8000').volatile(),
});
export function apply(ctx, config) {
    const provider = createLayaProvider({
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