/**
 * Rounds a number to the specified number of decimal places.
 * @param value The number to round.
 * @param fractionDigits The number of decimal places (default: 2).
 * @returns The rounded number.
 */
export function round2(value: number, fractionDigits: number = 2): number {
  return Number(Number(value).toFixed(fractionDigits));
}

/**
 * Rounds a number to the specified number of decimal places, or returns null if input is null.
 * @param value The number to round, or null.
 * @param fractionDigits The number of decimal places (default: 2).
 * @returns The rounded number, or null if input was null.
 */
export function round2Nullable(value: number | null, fractionDigits: number = 2): number | null {
  if (value === null) {
    return null;
  }

  return Number(Number(value).toFixed(fractionDigits));
}
