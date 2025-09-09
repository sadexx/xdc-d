import { EPlatformType } from "src/modules/sessions/common/enum";

export interface ICreateSession {
  userId: string;
  userRoleId: string;
  platform: EPlatformType;
  deviceId: string;
  deviceToken: string | null;
  iosVoipToken: string | null;
  clientIPAddress: string;
  clientUserAgent: string;
  refreshToken: string;
  refreshTokenExpirationDate: Date;
}
