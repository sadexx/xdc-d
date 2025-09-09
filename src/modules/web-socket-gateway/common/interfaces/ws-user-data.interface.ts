import { EUserRoleName } from "src/modules/users/common/enums";

export interface IWebSocketUserData {
  id: string;
  userRoleId: string;
  role: EUserRoleName;
  clientUserAgent: string;
  clientIPAddress: string;
  operatedByCompanyId: string;
  operatedByCompanyName: string;
  operatedByMainCorporateCompanyId: string | null;
  operatedByMainCorporateCompanyName: string | null;
}
