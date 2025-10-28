import { ONE_HUNDRED } from "src/common/constants";

/**
 * Converts a denormalized amount to a normalized amount by multiplying by 100 and rounding to integer.
 * This function is typically used to convert decimal amounts (e.g., 1.23) to normalized integer values
 * (e.g., 123) for storage or processing without floating-point precision issues.
 *
 * @param {number} denormalizedAmount - The denormalized amount (decimal value) to convert.
 * @returns {number} The normalized amount as an integer, representing the input multiplied by 100.
 */
export function denormalizedAmountToNormalized(denormalizedAmount: number): number {
  return Number((denormalizedAmount * ONE_HUNDRED).toFixed(0));
}

/**
 * Converts a normalized amount back to a denormalized amount by dividing by 100.
 * This function reverses the normalization process, converting integer values (e.g., 123)
 * back to decimal amounts (e.g., 1.23) for display or further calculations.
 *
 * @param {number} normalizedAmount - The normalized amount (integer value) to convert.
 * @returns {number} The denormalized amount as a decimal, representing the input divided by 100.
 */
export function normalizedAmountToDenormalized(normalizedAmount: number): number {
  return normalizedAmount / ONE_HUNDRED;
}
