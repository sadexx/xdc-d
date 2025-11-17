import { Role, User, UserRole } from "src/modules/users/entities";

/**
 ** Type
 */

export type TGetUserRoleByName = Pick<User, "id"> & {
  userRoles: (Pick<UserRole, "id"> & { role: Pick<Role, "name"> })[];
};
