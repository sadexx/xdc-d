import {
  TLoadAppointmentCaptureContext,
  TLoadPaymentCaptureContext,
} from "src/modules/payment-analysis/common/types/capture";
import { EPaymentOperation } from "src/modules/payment-analysis/common/enums";
import {
  ICommissionAmountsCaptureContext,
  ICorporateCaptureContext,
} from "src/modules/payment-analysis/common/interfaces/capture";
import { IPaymentCalculationResult } from "src/modules/payments-new/common/interfaces";

export interface ICapturePaymentContext {
  operation: EPaymentOperation.CAPTURE_PAYMENT;
  prices: IPaymentCalculationResult;
  corporateContext: ICorporateCaptureContext;
  appointment: TLoadAppointmentCaptureContext;
  payment: TLoadPaymentCaptureContext;
  commissionAmounts: ICommissionAmountsCaptureContext | null;
}
