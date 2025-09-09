import { EUserRoleName } from "src/modules/users/common/enums";
import { EPlatformType } from "src/modules/sessions/common/enum";

export interface ICurrentUserData {
  role: EUserRoleName;
  email: string;
  id?: string;
  userRoleId?: string;
  isOauth?: boolean;
  isInvitation?: boolean;
  isActive?: boolean;
  isAdditionalRole?: boolean;
  platform?: EPlatformType;
  deviceId?: string;
  deviceToken?: string | null;
  iosVoipToken?: string | null;
  clientUserAgent?: string;
  clientIPAddress?: string;
}
