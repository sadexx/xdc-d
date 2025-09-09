import { RolePermission } from "src/modules/permissions/common/interfaces";
import { EUserRoleName } from "src/modules/users/common/enums";

export type TRolesPermissions = {
  [K in EUserRoleName]?: RolePermission;
};
