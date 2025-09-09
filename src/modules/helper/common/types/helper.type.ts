import { Role, User, UserRole } from "src/modules/users/entities";

/**
 ** Type
 */

export type TGetUserRoleByName = Pick<User, "id"> & {
  userRoles: Array<Pick<UserRole, "id"> & { role: Pick<Role, "name"> }>;
};
