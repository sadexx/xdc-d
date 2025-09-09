import { EUserRoleName } from "src/modules/users/common/enums";
import { EPlatformType } from "src/modules/sessions/common/enum";

export interface IGoogleWebUserDataOutput {
  email: string;
  firstName: string;
  lastName: string;
  picture: string;
  role: EUserRoleName;
  platform: EPlatformType;
  deviceId: string;
  deviceToken: string;
  iosVoipToken: string;
  clientUserAgent: string;
  clientIPAddress: string;
}
