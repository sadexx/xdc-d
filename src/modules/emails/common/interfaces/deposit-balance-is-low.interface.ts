export interface IDepositBalanceIsLow {
  adminName: string;
  platformId: string;
  currentBalance?: number | null;
  minimumRequiredBalance?: number | null;
}
