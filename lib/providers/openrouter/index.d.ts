import type { Context, Volatile } from '@deepseek-ai/cordis';
import Schema from '@deepseek-ai/schemastery';
export { createOpenRouterProvider, type OpenRouterOptions } from './adapter.js';
export { OPENROUTER_MODELS } from './models.js';
export interface Config {
    id: string;
    apiKeyEnv: string;
    timeoutMs?: Volatile<number | undefined>;
}
interface ConfigInput {
    id?: string | null;
    apiKeyEnv?: string | null;
    timeoutMs?: number | null;
}
interface RuntimeConfig extends Config {
    timeoutMs: Volatile<number | undefined>;
}
export declare const inject: string[];
export declare const Config: Schema<ConfigInput, RuntimeConfig>;
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map