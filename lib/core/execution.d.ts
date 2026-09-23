/** Bounds our wait even if a third-party provider fails to observe its signal. */
export declare function execute<T>(signals: readonly AbortSignal[], timeoutMs: number, operation: (signal: AbortSignal) => Promise<T>): Promise<T>;
//# sourceMappingURL=execution.d.ts.map