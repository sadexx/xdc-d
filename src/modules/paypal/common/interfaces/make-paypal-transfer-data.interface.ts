import { OldECurrencies } from "src/modules/payments/common/enums";

export interface IMakePayPalTransferData {
  payerId: string;
  fullAmount: string;
  platformId: string;
  currency: OldECurrencies;
  idempotencyKey: string;
  isCorporate: boolean;
}
