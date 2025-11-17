import { TLoadWaitListAuthorizationContext } from "src/modules/payments-analysis/common/types/authorization";

export interface IWaitListAuthorizationContext {
  shouldRedirectToWaitList: boolean;
  existingWaitListRecord: TLoadWaitListAuthorizationContext | null;
}
