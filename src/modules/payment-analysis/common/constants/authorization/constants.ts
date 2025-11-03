/**
 * Threshold (in days) for redirecting payment authorization to wait list.
 * If appointment is scheduled beyond this threshold, payment is deferred.
 *
 * @example
 * daysUntilAppointment > WAIT_LIST_REDIRECT_THRESHOLD_DAYS -> defer payment
 * daysUntilAppointment <= WAIT_LIST_REDIRECT_THRESHOLD_DAYS -> authorize now
 */
export const WAIT_LIST_REDIRECT_THRESHOLD_DAYS: number = 4;
