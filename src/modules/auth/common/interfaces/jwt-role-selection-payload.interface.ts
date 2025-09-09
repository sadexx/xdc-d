import { EPlatformType } from "src/modules/sessions/common/enum";

export interface IJwtRoleSelectionPayload {
  email: string;
  userId: string;
  platform: EPlatformType;
  deviceId: string;
  deviceToken: string;
  iosVoipToken: string;
  clientUserAgent: string;
  clientIPAddress: string;
  iat: number;
  exp: number;
}
