import { EUserRoleName } from "src/modules/users/common/enums";

export interface IRegistrationTokenData {
  email: string;
  userId: string;
  userRole: EUserRoleName;
  clientIPAddress?: string;
  clientUserAgent?: string;
  isAdditionalRole?: boolean;
  isOauth?: boolean;
  isInvitation?: boolean;
}
