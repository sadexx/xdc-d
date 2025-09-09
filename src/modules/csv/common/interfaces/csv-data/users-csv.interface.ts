import { EAccountStatus, EUserGender, EUserRoleName } from "src/modules/users/common/enums";
import { ELanguages } from "src/modules/interpreters/profile/common/enum";

export interface IUsersCsv {
  fullName: string | null;
  accountStatus: EAccountStatus;
  role: EUserRoleName;
  phoneNumber: string | null;
  email: string;
  gender: EUserGender | null;
  knownLanguages?: ELanguages[] | null;
  country: string | null;
  state: string | null;
  city: string | null;
}
