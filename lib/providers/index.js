import Schema from '@deepseek-ai/schemastery';
import { apply as applyLaya } from './laya/index.js';
import { apply as applyTypesafe } from './typesafe/index.js';
export const inject = ['system1'];
export const Config = Schema.object({
    typesafeBaseURL: Schema.string().default('https://api.typesafe.ai').volatile(),
    layaBaseURL: Schema.string().default('http://127.0.0.1:8000').volatile(),
});
/** One DSH component exposes the distinct TypeSafe and Laya provider routes. */
export function apply(ctx, config) {
    applyTypesafe(ctx, {
        id: 'typesafe',
        apiKeyEnv: 'TYPESAFE_API_KEY',
        baseURL: config.typesafeBaseURL,
    });
    applyLaya(ctx, {
        id: 'laya',
        apiKeyEnv: 'LAYA_API_KEY',
        baseURL: config.layaBaseURL,
    });
}
//# sourceMappingURL=index.js.map