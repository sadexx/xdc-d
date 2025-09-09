export interface IDepositChargeFailed {
  adminName: string;
  amount: number;
  currency: string;
  platformId: string;
  receiptNumber: string;
}
