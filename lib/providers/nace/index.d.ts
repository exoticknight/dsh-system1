import type { Context, Volatile } from '@deepseek-ai/cordis';
import Schema from '@deepseek-ai/schemastery';
export { createNaceProvider, type NaceOptions } from './adapter.js';
export { NACE_MODELS } from './models.js';
export interface Config {
    id: string;
    apiKeyEnv: string;
    baseURL?: string | Volatile<string | undefined>;
}
interface ConfigInput {
    id?: string | null;
    apiKeyEnv?: string | null;
    baseURL?: string | null;
}
interface RuntimeConfig {
    id: string;
    apiKeyEnv: string;
    baseURL: Volatile<string | undefined>;
}
export declare const inject: string[];
export declare const Config: Schema<ConfigInput, RuntimeConfig>;
export declare function apply(ctx: Context, config: Config | RuntimeConfig): void;
//# sourceMappingURL=index.d.ts.map