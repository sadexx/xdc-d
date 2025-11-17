import { IPaymentCalculationResult } from "src/modules/payments/common/interfaces/pricing";

export interface IAuthorizationContextOptions {
  isShortTimeSlot: boolean;
  additionalBlockDuration?: number;
  initialPrices?: IPaymentCalculationResult;
}
