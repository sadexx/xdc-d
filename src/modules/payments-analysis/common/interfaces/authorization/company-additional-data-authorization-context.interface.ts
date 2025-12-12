import {
  IDepositChargeAuthorizationContext,
  IPostPaymentAuthorizationContext,
} from "src/modules/payments-analysis/common/interfaces/authorization";

export interface ICompanyAdditionalDataAuthorizationContext {
  depositChargeContext: IDepositChargeAuthorizationContext | null;
  postPaymentAuthorizationContext: IPostPaymentAuthorizationContext | null;
}
