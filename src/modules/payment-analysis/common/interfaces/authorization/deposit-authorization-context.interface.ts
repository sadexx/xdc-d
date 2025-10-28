export interface IDepositChargeAuthorizationContext {
  /**
   * Current deposit balance before charge
   */
  depositAmount: number;
  /**
   * Default amount to recharge when balance is low
   */
  depositDefaultChargeAmount: number;
  /**
   * Projected balance after charging requiredAmount
   */
  balanceAfterCharge: number;
  /**
   * Whether projected balance is below 10% of default charge amount
   * Triggers automatic recharge
   */
  isBalanceBelowTenPercent: boolean;
  /**
   * Whether projected balance is below 15% of default charge amount
   * Triggers low balance warning (if not below 10%)
   */
  isBalanceBelowFifteenPercent: boolean;
}
