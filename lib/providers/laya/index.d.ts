import type { Context, Volatile } from '@deepseek-ai/cordis';
import Schema from '@deepseek-ai/schemastery';
export { createLayaProvider, type LayaOptions } from './adapter.js';
export interface Config {
    id: string;
    apiKeyEnv: string;
    baseURL: string | Volatile<string>;
}
interface ConfigInput {
    id?: string | null;
    apiKeyEnv?: string | null;
    baseURL?: string | null;
}
interface RuntimeConfig {
    id: string;
    apiKeyEnv: string;
    baseURL: Volatile<string>;
}
export declare const inject: string[];
export declare const Config: Schema<ConfigInput, RuntimeConfig>;
export declare function apply(ctx: Context, config: Config | RuntimeConfig): void;
//# sourceMappingURL=index.d.ts.map