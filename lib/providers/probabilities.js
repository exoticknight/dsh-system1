const ROUNDING_ERROR = 0.5e-4;
/** Correct only the accumulated error from per-option rounding to four decimal places. */
export function normalizeRoundedDistributionRecord(probabilities) {
    const keys = Object.keys(probabilities);
    const values = normalizeRoundedDistribution(keys.map((key) => probabilities[key]));
    return Object.fromEntries(keys.map((key, index) => [key, values[index]]));
}
export function normalizeRoundedDistribution(probabilities) {
    if (probabilities.length === 0 || probabilities.some((value) => !Number.isFinite(value) || value < 0 || value > 1))
        return probabilities;
    const total = probabilities.reduce((sum, value) => sum + value, 0);
    const roundingBound = probabilities.length * ROUNDING_ERROR;
    if (!(total > 0) || total === 1 ||
        Math.abs(total - 1) > roundingBound + Number.EPSILON * probabilities.length)
        return probabilities;
    return probabilities.map((value) => value / total);
}
/** Reconcile a rounded mean only within the error of rounding its own buckets. */
export function normalizeRoundedScore(value, probabilities) {
    const normalized = normalizeRoundedDistribution(probabilities);
    if (normalized === probabilities)
        return { value, probabilities };
    const mean = normalized.reduce((sum, probability, index) => sum + index * probability, 0);
    // Since the unrounded buckets sum to 1, the error in their mean is bounded
    // by each bucket's rounding error weighted by its distance from the mean.
    const roundingBound = ROUNDING_ERROR * (1 + probabilities.reduce((sum, _, index) => sum + Math.abs(index - mean), 0));
    return {
        value: Math.abs(value - mean) <= roundingBound ? mean : value,
        probabilities: normalized,
    };
}
//# sourceMappingURL=probabilities.js.map