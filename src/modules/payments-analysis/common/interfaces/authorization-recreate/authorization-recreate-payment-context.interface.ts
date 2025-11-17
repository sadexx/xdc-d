import { EPaymentOperation } from "src/modules/payments-analysis/common/enums/core";
import {
  TCompanyAuthorizationRecreateContext,
  TLoadAppointmentAuthorizationRecreateContext,
  TOldPaymentAuthorizationRecreateContext,
} from "src/modules/payments-analysis/common/types/authorization-recreate";
import { IPaymentCalculationResult } from "src/modules/payments/common/interfaces/pricing";

export interface IAuthorizationRecreatePaymentContext {
  operation: EPaymentOperation.AUTHORIZATION_RECREATE_PAYMENT;
  appointment: TLoadAppointmentAuthorizationRecreateContext;
  isClientCorporate: boolean;
  hasPriceChanged: boolean;
  prices: IPaymentCalculationResult;
  payment: TOldPaymentAuthorizationRecreateContext;
  company: TCompanyAuthorizationRecreateContext | null;
}
