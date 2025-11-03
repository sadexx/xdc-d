import { EPaymentCurrency } from "src/modules/payments-new/common/enums";
import { EPaymentOperation } from "src/modules/payment-analysis/common/enums";
import { IPaymentCalculationResult } from "src/modules/payments-new/common/interfaces";
import {
  TLoadAppointmentAuthorizationContext,
  TLoadExistingPaymentAuthorizationContext,
} from "src/modules/payment-analysis/common/types/authorization";
import {
  ICompanyAuthorizationContext,
  IDepositChargeAuthorizationContext,
  ITimingAuthorizationContext,
  IWaitListAuthorizationContext,
} from "src/modules/payment-analysis/common/interfaces/authorization";

export interface IAuthorizationPaymentContext {
  operation: EPaymentOperation.AUTHORIZE_PAYMENT;
  appointment: TLoadAppointmentAuthorizationContext;
  isClientCorporate: boolean;
  isShortTimeSlot: boolean;
  paymentMethodInfo: string;
  currency: EPaymentCurrency;
  waitListContext: IWaitListAuthorizationContext;
  timingContext: ITimingAuthorizationContext;
  existingPayment: TLoadExistingPaymentAuthorizationContext | null;
  companyContext: ICompanyAuthorizationContext | null;
  prices: IPaymentCalculationResult | null;
  depositChargeContext: IDepositChargeAuthorizationContext | null;
}
