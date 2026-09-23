import type { Context } from '@deepseek-ai/cordis';
import Schema from '@deepseek-ai/schemastery';
export { createTypesafeProvider, type TypesafeOptions } from './adapter.js';
export interface Config {
    id: string;
    apiKeyEnv: string;
    baseURL?: string;
}
export declare const inject: string[];
export declare const Config: Schema<Schemastery.ObjectS<{
    id: Schema<string, string>;
    apiKeyEnv: Schema<string, string>;
    baseURL: Schema<string, string>;
}>, Schemastery.ObjectT<{
    id: Schema<string, string>;
    apiKeyEnv: Schema<string, string>;
    baseURL: Schema<string, string>;
}>>;
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map