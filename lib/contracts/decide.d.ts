import type { DecideInput, DecideOutput, ModelCapabilities } from './provider.js';
export declare const decideOutputSchema: import("zod").ZodObject<{
    answers: import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>;
    usage: import("zod").ZodOptional<import("zod").ZodObject<{
        inputTokens: import("zod").ZodOptional<import("zod").ZodNumber>;
        outputTokens: import("zod").ZodOptional<import("zod").ZodNumber>;
    }, import("zod/v4/core").$strict>>;
    approximate: import("zod").ZodOptional<import("zod").ZodBoolean>;
    degraded: import("zod").ZodOptional<import("zod").ZodBoolean>;
}, import("zod/v4/core").$strict>;
export declare const decideOperation: import("./operation.js").OperationDefinition<DecideInput, DecideOutput, ModelCapabilities>;
//# sourceMappingURL=decide.d.ts.map