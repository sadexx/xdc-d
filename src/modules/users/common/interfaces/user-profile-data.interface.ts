import { User } from "src/modules/users/entities";
import { EUserRoleName } from "src/modules/users/common/enums";
import { TFindUserProfileUserRole } from "src/modules/users/common/types";

export interface IUserProfileData extends Omit<User, "setPlatformId"> {
  userRoleId: string;
  country: string | null;
  userRoleCreationDate: Date;
  userRoleOperatedById: string;
  userRoleOperatedByName: string;
  userRoleIsActive: boolean;
  roleName: EUserRoleName;
  currentUserRole: TFindUserProfileUserRole;
}
