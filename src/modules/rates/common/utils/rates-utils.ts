import { DECIMAL_PRECISION_FOR_RATES } from "src/modules/rates/common/constants";
import { TimeString } from "src/modules/rates/common/types";
import { parse, set } from "date-fns";

/**
 * Formats the rate per minute based on a total rate and a specified time duration.
 *
 * @param totalRate - The total rate to be divided over the duration.
 * @param detailsTime - The duration in minutes.
 * @returns The formatted rate per minute as a string, rounded to a specified number of decimal places.
 */

export function formatRatePerMinute(totalRate: number, detailsTime: number): string {
  return (totalRate / detailsTime).toFixed(DECIMAL_PRECISION_FOR_RATES);
}

/**
 * Formats the rate per minute based on a total rate and a specified time duration.
 * If the total rate is null, returns null.
 *
 * @param totalRate - The total rate to be divided over the duration. If null, the function returns null.
 * @param detailsTime - The duration in minutes.
 * @returns The formatted rate per minute as a string, rounded to two decimal places, or null if totalRate is null.
 */
export function formatRatePerMinuteNullable(totalRate: number | null, detailsTime: number): string | null {
  if (totalRate === null) {
    return null;
  }

  return (totalRate / detailsTime).toFixed(DECIMAL_PRECISION_FOR_RATES);
}

/**
 * Convert TimeString to Date by applying the time to a given base date
 */
export function applyRateTimeToDate(timeString: TimeString, baseDate: Date): Date {
  const parsedTime = parse(timeString, "HH:mm:ss", new Date());

  return set(baseDate, {
    hours: parsedTime.getHours(),
    minutes: parsedTime.getMinutes(),
    seconds: 0,
    milliseconds: 0,
  });
}
