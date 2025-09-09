import { TProcessUserRegistrationLink, TProcessUserRegistrationLinkUserRole } from "src/modules/users/common/types";

export interface IProcessUserRegistrationLink {
  userRole: TProcessUserRegistrationLinkUserRole;
  user: TProcessUserRegistrationLink;
  isUserExists: boolean;
}
