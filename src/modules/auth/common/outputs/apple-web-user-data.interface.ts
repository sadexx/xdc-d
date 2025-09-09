import { EUserRoleName } from "src/modules/users/common/enums";
import { EPlatformType } from "src/modules/sessions/common/enum";

export interface IAppleWebUserDataOutput {
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: EUserRoleName;
  platform: EPlatformType;
  deviceId: string;
  deviceToken: string;
  iosVoipToken: string;
  clientUserAgent: string;
  clientIPAddress: string;
}
