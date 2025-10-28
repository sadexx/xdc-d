/**
 * Threshold (in days) for redirecting payment authorization to wait list.
 * If appointment is scheduled beyond this threshold, payment is deferred.
 *
 * @example
 * daysUntilAppointment > WAIT_LIST_REDIRECT_THRESHOLD_DAYS -> defer payment
 * daysUntilAppointment <= WAIT_LIST_REDIRECT_THRESHOLD_DAYS -> authorize now
 */
export const WAIT_LIST_REDIRECT_THRESHOLD_DAYS: number = 4;
/**
 * Minimum time window (in minutes) required before appointment start to process payment authorization.
 * If an appointment is scheduled to start within this time window from now, it's considered too late
 * to process payment and the appointment will be cancelled.
 */
export const PAYMENT_AUTHORIZATION_CUTOFF_MINUTES: number = 5;
