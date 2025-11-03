import { IPaymentCalculationResult } from "src/modules/payments-new/common/interfaces";

export interface IPaymentAnalysisAdditionalData {
  prices?: IPaymentCalculationResult;
  isCancelByClient?: boolean;
  isShortTimeSlot?: boolean;
}
