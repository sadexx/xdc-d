import { EPaymentCurrency } from "src/modules/payments/common/enums/core";
import { EPaymentOperation } from "src/modules/payments-analysis/common/enums/core";
import {
  TExistingPaymentAuthorizationContext,
  TLoadAppointmentAuthorizationContext,
} from "src/modules/payments-analysis/common/types/authorization";
import {
  ICompanyAuthorizationContext,
  IDepositChargeAuthorizationContext,
  ITimingAuthorizationContext,
  IWaitListAuthorizationContext,
} from "src/modules/payments-analysis/common/interfaces/authorization";
import { IPaymentCalculationResult } from "src/modules/payments/common/interfaces/pricing";

export interface IAuthorizationPaymentContext {
  operation: EPaymentOperation.AUTHORIZE_PAYMENT | EPaymentOperation.AUTHORIZE_ADDITIONAL_BLOCK_PAYMENT;
  appointment: TLoadAppointmentAuthorizationContext;
  isClientCorporate: boolean;
  isShortTimeSlot: boolean;
  additionalBlockDuration: number;
  paymentMethodInfo: string;
  currency: EPaymentCurrency;
  waitListContext: IWaitListAuthorizationContext;
  timingContext: ITimingAuthorizationContext;
  existingPayment: TExistingPaymentAuthorizationContext | null;
  companyContext: ICompanyAuthorizationContext | null;
  prices: IPaymentCalculationResult | null;
  depositChargeContext: IDepositChargeAuthorizationContext | null;
}
