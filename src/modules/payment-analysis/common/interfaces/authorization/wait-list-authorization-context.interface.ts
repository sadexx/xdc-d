import { TLoadWaitListAuthorizationContext } from "src/modules/payment-analysis/common/types/authorization";

export interface IWaitListAuthorizationContext {
  shouldRedirectToWaitList: boolean;
  existingWaitListRecord: TLoadWaitListAuthorizationContext | null;
}
