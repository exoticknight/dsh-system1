/** Correct only the accumulated error from per-option rounding to four decimal places. */
export declare function normalizeRoundedDistributionRecord(probabilities: Readonly<Record<string, number>>): Readonly<Record<string, number>>;
export declare function normalizeRoundedDistribution(probabilities: readonly number[]): readonly number[];
/** Reconcile a rounded mean only within the error of rounding its own buckets. */
export declare function normalizeRoundedScore(value: number, probabilities: readonly number[]): {
    value: number;
    probabilities: readonly number[];
};
//# sourceMappingURL=probabilities.d.ts.map