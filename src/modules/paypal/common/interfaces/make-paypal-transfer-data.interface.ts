import { EPaymentCurrency } from "src/modules/payments/common/enums/core";

export interface IMakePayPalTransferData {
  payerId: string;
  fullAmount: string;
  platformId: string;
  currency: EPaymentCurrency;
  idempotencyKey: string;
  isCorporate: boolean;
}
