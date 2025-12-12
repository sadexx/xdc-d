export interface IPostPaymentAuthorizationContext {
  /**
   * Whether transaction would exceed credit limit
   */
  isExceedingCreditLimit: boolean;
  /**
   * Projected used amount after this charge
   */
  usedAmountAfterCharge: number;
}
