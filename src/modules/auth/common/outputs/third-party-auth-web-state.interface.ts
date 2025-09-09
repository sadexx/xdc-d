import { EUserRoleName } from "src/modules/users/common/enums";
import { EPlatformType } from "src/modules/sessions/common/enum";

export interface IThirdPartyAuthWebStateOutput {
  role: EUserRoleName;
  platform: EPlatformType;
  deviceId: string;
  deviceToken: string;
  iosVoipToken: string;
  IPAddress: string;
  userAgent: string;
}
