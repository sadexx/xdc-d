import { EUserRoleName } from "src/modules/users/common/enums";
import { EPlatformType } from "src/modules/sessions/common/enum";

export interface IThirdPartyAuthData {
  email: string;
  role?: EUserRoleName;
  platform: EPlatformType;
  deviceId: string;
  deviceToken: string | null;
  iosVoipToken: string | null;
  clientUserAgent: string;
  clientIPAddress: string;
}
