import {
  TLoadAppointmentCaptureContext,
  TPaymentCaptureContext,
} from "src/modules/payments-analysis/common/types/capture";
import { EPaymentOperation } from "src/modules/payments-analysis/common/enums/core";
import { ICommissionAmountsCaptureContext } from "src/modules/payments-analysis/common/interfaces/capture";
import { IPaymentCalculationResult } from "src/modules/payments/common/interfaces/pricing";

export interface ICapturePaymentContext {
  operation: EPaymentOperation.CAPTURE_PAYMENT;
  isSecondAttempt: boolean;
  isClientCorporate: boolean;
  isInterpreterCorporate: boolean;
  clientCountry: string;
  interpreterCountry: string | null;
  isSameCorporateCompany: boolean;
  prices: IPaymentCalculationResult;
  appointment: TLoadAppointmentCaptureContext;
  payment: TPaymentCaptureContext;
  commissionAmounts: ICommissionAmountsCaptureContext | null;
}
