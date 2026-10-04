import type { Context, Volatile } from '@deepseek-ai/cordis';
import Schema from '@deepseek-ai/schemastery';
interface ConfigInput {
    typesafeBaseURL?: string | null;
    layaBaseURL?: string | null;
    cloudflareBaseURL?: string | null;
    cloudflareAccountId?: string | null;
}
interface RuntimeConfig {
    typesafeBaseURL: Volatile<string>;
    layaBaseURL: Volatile<string>;
    cloudflareBaseURL: Volatile<string>;
    cloudflareAccountId: Volatile<string>;
}
export declare const inject: string[];
export declare const Config: Schema<ConfigInput, RuntimeConfig>;
/** One DSH component exposes the distinct provider routes. */
export declare function apply(ctx: Context, config: RuntimeConfig): void;
export {};
//# sourceMappingURL=index.d.ts.map