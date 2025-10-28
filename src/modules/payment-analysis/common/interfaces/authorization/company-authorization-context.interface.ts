import {
  TLoadCompanyAuthorizationContext,
  TLoadCompanySuperAdminAuthorizationContext,
} from "src/modules/payment-analysis/common/types/authorization";

export interface ICompanyAuthorizationContext {
  company: TLoadCompanyAuthorizationContext;
  superAdminRole: TLoadCompanySuperAdminAuthorizationContext | null;
}
