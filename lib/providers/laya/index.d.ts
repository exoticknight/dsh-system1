import type { Context, Volatile } from '@deepseek-ai/cordis';
import Schema from '@deepseek-ai/schemastery';
export { createLayaProvider, type LayaOptions } from './adapter.js';
export { LAYA_MODELS } from './models.js';
export interface Config {
    id: string;
    apiKeyEnv: string;
    baseURL: string | Volatile<string>;
    timeoutMs?: Volatile<number | undefined>;
}
interface ConfigInput {
    id?: string | null;
    apiKeyEnv?: string | null;
    baseURL?: string | null;
    timeoutMs?: number | null;
}
interface RuntimeConfig {
    id: string;
    apiKeyEnv: string;
    baseURL: Volatile<string>;
    timeoutMs: Volatile<number | undefined>;
}
export declare const inject: string[];
export declare const Config: Schema<ConfigInput, RuntimeConfig>;
export declare function apply(ctx: Context, config: Config | RuntimeConfig): void;
//# sourceMappingURL=index.d.ts.map