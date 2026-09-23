import Schema from '@deepseek-ai/schemastery';
import { createTypesafeProvider } from './adapter.js';
export { createTypesafeProvider } from './adapter.js';
export const inject = ['system1'];
export const Config = Schema.object({
    id: Schema.string().default('typesafe'),
    apiKeyEnv: Schema.string().default('TYPESAFE_API_KEY'),
    baseURL: Schema.string(),
});
export function apply(ctx, config) {
    const provider = createTypesafeProvider({
        apiKey: process.env[config.apiKeyEnv] ?? '',
        ...(config.baseURL ? { baseURL: config.baseURL } : {}),
    });
    ctx.effect(() => ctx.system1.registerProvider(config.id, provider));
}
//# sourceMappingURL=index.js.map