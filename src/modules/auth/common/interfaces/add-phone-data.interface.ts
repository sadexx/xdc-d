import { EUserRoleName } from "src/modules/users/common/enums";

export interface IAddPhoneData {
  phoneNumber: string;
  role: EUserRoleName;
  email: string;
}
