import {
  TCompanyAuthorizationCancelContext,
  TLoadAppointmentAuthorizationCancelContext,
  TPaymentAuthorizationCancelContext,
} from "src/modules/payments-analysis/common/types/authorization-cancel";
import { EPaymentOperation } from "src/modules/payments-analysis/common/enums/core";

export interface IAuthorizationCancelPaymentContext {
  operation: EPaymentOperation.AUTHORIZATION_CANCEL_PAYMENT;
  appointment: TLoadAppointmentAuthorizationCancelContext;
  isClientCorporate: boolean;
  isRestricted: boolean;
  payment: TPaymentAuthorizationCancelContext;
  company: TCompanyAuthorizationCancelContext | null;
}
