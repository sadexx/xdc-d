import { IPaymentCalculationResult } from "src/modules/payments/common/interfaces/pricing";

export interface ITransferContextOptions {
  prices: IPaymentCalculationResult;
  isSecondAttempt: boolean;
}
