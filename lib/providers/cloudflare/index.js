import Schema from '@deepseek-ai/schemastery';
import { credentialRef, isCredentialRefName, } from '@deepseek-ai/dsh-credentials';
import { createCloudflareProvider } from './adapter.js';
export { createCloudflareProvider } from './adapter.js';
export const inject = ['system1'];
export const Config = Schema.object({
    id: Schema.string().default('cloudflare'),
    apiKeyEnv: Schema.string()
        .role('credential-ref')
        .pattern(/^[A-Za-z_][A-Za-z0-9_]*$/u)
        .default('CLOUDFLARE_API_TOKEN'),
    accountId: Schema.string().default('').volatile(),
    baseURL: Schema.string()
        .default('https://api.cloudflare.com/client/v4')
        .volatile(),
});
export function apply(ctx, config) {
    const provider = createCloudflareProvider({
        resolveApiKey: async () => {
            const ref = config.apiKeyEnv;
            if (!isCredentialRefName(ref))
                return undefined;
            const credentials = ctx.get('credentials');
            if (credentials)
                return (await credentials.resolve(credentialRef(ref)))?.value;
            return process.env[ref];
        },
        resolveAccountId: () => readConfigValue(config.accountId)?.trim() || process.env.CLOUDFLARE_ACCOUNT_ID,
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