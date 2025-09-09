import { EUserRoleName } from "src/modules/users/common/enums";

export interface IEmailConfirmationTokenData {
  email: string;
  userRole: EUserRoleName;
  clientIPAddress: string;
  clientUserAgent: string;
}
