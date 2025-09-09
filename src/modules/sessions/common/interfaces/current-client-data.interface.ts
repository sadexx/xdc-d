import { EPlatformType } from "src/modules/sessions/common/enum";

export interface ICurrentClientData {
  platform: EPlatformType;
  deviceId: string;
  deviceToken: string | null;
  iosVoipToken: string | null;
  IPAddress: string;
  userAgent: string;
}
