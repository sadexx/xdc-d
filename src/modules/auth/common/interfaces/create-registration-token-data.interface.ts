import { EUserRoleName } from "src/modules/users/common/enums";

export interface IStartRegistrationSessionData {
  userId: string;
  email: string;
  userRole: EUserRoleName;
  clientIPAddress: string;
  clientUserAgent: string;
  isOauth?: boolean;
  isAdditionalRole?: boolean;
  isInvitation?: boolean;
}
