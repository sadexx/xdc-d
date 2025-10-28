export interface IChargeByBECSDebitData {
  amount: number;
  currency: string;
  paymentMethodId: string;
  customerId: string;
  companyPlatformId: string;
  idempotencyKey: string;
}
