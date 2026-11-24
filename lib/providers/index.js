import Schema from '@deepseek-ai/schemastery';
import { apply as applyCloudflare } from './cloudflare/index.js';
import { apply as applyLaya } from './laya/index.js';
import { apply as applyLiquid } from './liquid/index.js';
import { LIQUID_BASE_URL } from './liquid/models.js';
import { apply as applyMeraGpt } from './meragpt/index.js';
import { apply as applyNace } from './nace/index.js';
import { apply as applyTypesafe } from './typesafe/index.js';
export { findProviderModel } from './models.js';
export const inject = ['system1'];
export const Config = Schema.object({
    typesafeBaseURL: Schema.string().default('https://api.typesafe.ai').volatile(),
    layaBaseURL: Schema.string().default('http://127.0.0.1:8000').volatile(),
    liquidBaseURL: Schema.string().default(LIQUID_BASE_URL).volatile(),
    meragptBaseURL: Schema.string().default('https://meragpt.com').volatile(),
    naceBaseURL: Schema.string().default('https://console.nace.ai').volatile(),
    cloudflareBaseURL: Schema.string()
        .default('https://api.cloudflare.com/client/v4')
        .volatile(),
    cloudflareAccountId: Schema.string().default('').volatile(),
});
/** One DSH component exposes the distinct provider routes. */
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
    applyMeraGpt(ctx, {
        id: 'meragpt',
        apiKeyEnv: 'MERAGPT_API_KEY',
        baseURL: config.meragptBaseURL,
    });
    applyLiquid(ctx, {
        id: 'liquid',
        apiKeyEnv: 'LIQUID_API_KEY',
        baseURL: config.liquidBaseURL ?? LIQUID_BASE_URL,
    });
    applyNace(ctx, {
        id: 'nace',
        apiKeyEnv: 'NACE_API_KEY',
        baseURL: config.naceBaseURL,
    });
    applyCloudflare(ctx, {
        id: 'cloudflare',
        apiKeyEnv: 'CLOUDFLARE_API_TOKEN',
        baseURL: config.cloudflareBaseURL,
        accountId: config.cloudflareAccountId,
    });
}
//# sourceMappingURL=index.js.map