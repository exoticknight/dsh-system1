import type { Context, Volatile } from '@deepseek-ai/cordis';
import Schema from '@deepseek-ai/schemastery';
export { createCloudflareProvider, type CloudflareOptions } from './adapter.js';
export interface Config {
    id: string;
    apiKeyEnv: string;
    accountId: string | Volatile<string>;
    baseURL: string | Volatile<string>;
}
interface ConfigInput {
    id?: string | null;
    apiKeyEnv?: string | null;
    accountId?: string | null;
    baseURL?: string | null;
}
interface RuntimeConfig {
    id: string;
    apiKeyEnv: string;
    accountId: Volatile<string>;
    baseURL: Volatile<string>;
}
export declare const inject: string[];
export declare const Config: Schema<ConfigInput, RuntimeConfig>;
export declare function apply(ctx: Context, config: Config | RuntimeConfig): void;
//# sourceMappingURL=index.d.ts.map