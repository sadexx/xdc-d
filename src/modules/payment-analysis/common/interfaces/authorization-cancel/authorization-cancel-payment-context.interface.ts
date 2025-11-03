import {
  TLoadAppointmentAuthorizationCancelContext,
  TLoadCompanyAuthorizationCancelContext,
  TLoadPaymentAuthorizationCancelContext,
} from "src/modules/payment-analysis/common/types/authorization-cancel";
import { EPaymentOperation } from "src/modules/payment-analysis/common/enums";

export interface IAuthorizationCancelPaymentContext {
  operation: EPaymentOperation.AUTHORIZATION_CANCEL_PAYMENT;
  appointment: TLoadAppointmentAuthorizationCancelContext;
  isClientCorporate: boolean;
  isRestricted: boolean;
  payment: TLoadPaymentAuthorizationCancelContext;
  company: TLoadCompanyAuthorizationCancelContext | null;
}
