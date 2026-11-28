import Schema from '@deepseek-ai/schemastery';
import { decideOperation } from '../../index.js';
import { CHINESE_DECISION_DEFAULT_BASE_URL, CHINESE_DECISION_DEFAULT_TIMEOUT_MS, createChineseDecisionProvider, } from './adapter.js';
export { CHINESE_DECISION_MODELS, createChineseDecisionProvider } from './adapter.js';
export const inject = ['system1'];
export const Config = Schema.object({
    id: Schema.string().default('chinese-decision'),
    baseURL: Schema.string().default(CHINESE_DECISION_DEFAULT_BASE_URL),
    timeoutMs: Schema.number().min(1).max(2147483647).step(1).default(CHINESE_DECISION_DEFAULT_TIMEOUT_MS),
});
export function apply(ctx, config) {
    const provider = createChineseDecisionProvider(config);
    ctx.effect(() => ctx.system1.registerImplementation(decideOperation, config.id, provider));
}
//# sourceMappingURL=index.js.map