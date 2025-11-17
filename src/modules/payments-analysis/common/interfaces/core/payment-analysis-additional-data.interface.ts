import { IPaymentCalculationResult } from "src/modules/payments/common/interfaces/pricing";

export interface IPaymentAnalysisAdditionalData {
  prices?: IPaymentCalculationResult;
  additionalBlockDuration?: number;
  isCancelledByClient?: boolean;
  isShortTimeSlot?: boolean;
  isSecondAttempt?: boolean;
  oldAppointmentId?: string;
}
