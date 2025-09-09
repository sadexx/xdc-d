import { EAccountStatus, EUserRoleName } from "src/modules/users/common/enums";

export interface IEmployeesCsv {
  fullName: string;
  accountStatus: EAccountStatus;
  role: EUserRoleName;
  phoneNumber: string | null;
  email: string;
  city: string | null;
}
