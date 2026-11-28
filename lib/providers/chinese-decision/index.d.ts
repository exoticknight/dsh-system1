import type { Context } from '@deepseek-ai/cordis';
import Schema from '@deepseek-ai/schemastery';
export { CHINESE_DECISION_MODELS, createChineseDecisionProvider, type ChineseDecisionOptions } from './adapter.js';
export interface Config {
    id: string;
    baseURL: string;
    timeoutMs: number;
}
export declare const inject: string[];
export declare const Config: Schema<Schemastery.ObjectS<NoInfer<{
    id: Schema<string, string, "defined">;
    baseURL: Schema<string, string, "defined">;
    timeoutMs: Schema<number, number, "defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    id: Schema<string, string, "defined">;
    baseURL: Schema<string, string, "defined">;
    timeoutMs: Schema<number, number, "defined">;
}>>, "plain">;
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map