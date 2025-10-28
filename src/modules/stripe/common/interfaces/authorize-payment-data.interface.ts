export interface IAuthorizePaymentData {
  amount: number;
  currency: string;
  paymentMethodId: string;
  customerId: string;
  appointmentPlatformId: string;
  idempotencyKey?: string;
}
