import {
  TCompanyAuthorizationCancelContext,
  TLoadAppointmentAuthorizationCancelContext,
  TPaymentAuthorizationCancelContext,
} from "src/modules/payments-analysis/common/types/authorization-cancel";

export interface ICancelAuthorizationContext {
  appointment: TLoadAppointmentAuthorizationCancelContext;
  payment: TPaymentAuthorizationCancelContext;
  company: TCompanyAuthorizationCancelContext | null;
}
