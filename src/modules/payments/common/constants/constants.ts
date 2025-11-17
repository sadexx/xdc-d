import {
  NUMBER_OF_MINUTES_IN_HALF_HOUR,
  NUMBER_OF_MINUTES_IN_TWELVE_HOURS,
  NUMBER_OF_MINUTES_IN_DAY,
  NUMBER_OF_MINUTES_IN_TWO_DAYS,
  NUMBER_OF_MINUTES_IN_THREE_DAYS,
  NUMBER_OF_MINUTES_IN_FOUR_DAYS,
} from "src/common/constants";

/**
 * Minimum time window (in minutes) required before appointment start to process payment authorization.
 * If an appointment is scheduled to start within this time window from now, it's considered too late
 * to process payment and the appointment will be cancelled.
 */
export const PAYMENT_AUTHORIZATION_CUTOFF_MINUTES: number = 5;

/**
 * Time offsets in minutes defining the processing frames for payment waitList checks.
 * Used to calculate shifted time intervals for fetching eligible appointments.
 */
export const PAYMENT_PROCESSING_OFFSETS: readonly number[] = [
  NUMBER_OF_MINUTES_IN_HALF_HOUR,
  NUMBER_OF_MINUTES_IN_TWELVE_HOURS,
  NUMBER_OF_MINUTES_IN_DAY,
  NUMBER_OF_MINUTES_IN_TWO_DAYS,
  NUMBER_OF_MINUTES_IN_THREE_DAYS,
  NUMBER_OF_MINUTES_IN_FOUR_DAYS,
];
