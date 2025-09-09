import { EUserRoleName } from "src/modules/users/common/enums";

export interface ICreateTokensData {
  userId: string;
  userRoleId: string;
  userRole: EUserRoleName;
  clientIPAddress: string;
  clientUserAgent: string;
}
