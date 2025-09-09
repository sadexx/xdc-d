import { EPlatformType } from "src/modules/sessions/common/enum";

export interface IRoleSelectionTokenData {
  email: string;
  platform: EPlatformType;
  deviceId: string;
  deviceToken: string | null;
  iosVoipToken: string | null;
  clientIPAddress: string;
  clientUserAgent: string;
}
