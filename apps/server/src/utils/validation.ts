/**
 * Safely parse an integer from an unknown value.
 * Returns `defaultValue` when the input is NaN, and clamps the result
 * between `min` and `max` to prevent excessively large or negative values.
 */
export function safeParseInt(
    value: unknown,
    defaultValue: number,
    min = 0,
    max = 1000
): number {
    const parsed = parseInt(String(value), 10);
    if (isNaN(parsed)) return defaultValue;
    return Math.max(min, Math.min(max, parsed));
}
