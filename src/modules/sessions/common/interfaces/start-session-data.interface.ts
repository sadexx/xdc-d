import { ICreateTokensData } from "src/modules/auth/common/interfaces";
import { EPlatformType } from "src/modules/sessions/common/enum";

export interface IStartSessionData extends ICreateTokensData {
  platform: EPlatformType;
  deviceId: string;
  deviceToken: string | null;
  iosVoipToken: string | null;
  isRequiredInfoFulfilled: boolean;
  isActive: boolean;
  isUpdateFirstStageToken?: boolean;
}
