import {
  TCompanyAuthorizationContext,
  TCompanySuperAdminAuthorizationContext,
} from "src/modules/payments-analysis/common/types/authorization";

export interface ICompanyAuthorizationContext {
  company: TCompanyAuthorizationContext;
  superAdminRole: TCompanySuperAdminAuthorizationContext | null;
}
