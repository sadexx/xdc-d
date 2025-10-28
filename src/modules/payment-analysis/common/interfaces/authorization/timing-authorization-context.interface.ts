export interface ITimingAuthorizationContext {
  /**
   * Whether appointment is too close to start time to process payment.
   * If true, appointment should be cancelled instead of redirected to wait list.
   */
  isTooLateForPayment: boolean;
  /**
   * Whether appointment was created more than 24 hours before start.
   */
  isCreatedMoreThan24HoursBeforeStart: boolean;
  /**
   * Whether appointment was created more than 6 hours before start.
   */
  isCreatedMoreThan6HoursBeforeStart: boolean;
  /**
   * Whether we're within 24.5 hour window before start.
   */
  isWithin24AndHalfHourWindow: boolean;
}
