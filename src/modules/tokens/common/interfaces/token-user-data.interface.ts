import { EUserRoleName } from "src/modules/users/common/enums";

export interface ITokenUserData {
  id: string;
  role: EUserRoleName;
  userRoleId: string;
  clientUserAgent: string;
  clientIPAddress: string;
}
