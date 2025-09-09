import { ETimeCalculationMode } from "src/modules/rates/common/enums";

/**
 * Determine the time calculation mode based on the scheduled appointment time
 * and the normal hours specified by the rate.
 *
 * @param scheduledStart - The start date and time of the scheduled appointment.
 * @param scheduledEnd - The end date and time of the scheduled appointment.
 * @param normalStart - The start time of the normal hours as specified in the rate.
 * @param normalEnd - The end time of the normal hours as specified in the rate.
 *
 * @returns The time calculation mode (normal, peak, or cross-boundary).
 */
export function determineTimeCalculationMode(
  scheduledStart: Date,
  scheduledEnd: Date,
  normalStart: Date,
  normalEnd: Date,
): ETimeCalculationMode {
  const isStartBeforeNormal = scheduledStart < normalStart;
  const isEndBeforeNormal = scheduledEnd < normalStart;
  const isStartAfterNormal = scheduledStart > normalEnd;
  const isEndAfterNormal = scheduledEnd > normalEnd;

  if ((isStartBeforeNormal && isEndBeforeNormal) || (isStartAfterNormal && isEndAfterNormal)) {
    return ETimeCalculationMode.PEAK;
  }

  if ((isStartBeforeNormal && !isEndBeforeNormal) || (isEndAfterNormal && !isStartAfterNormal)) {
    return ETimeCalculationMode.CROSS_BOUNDARY;
  }

  return ETimeCalculationMode.NORMAL;
}
