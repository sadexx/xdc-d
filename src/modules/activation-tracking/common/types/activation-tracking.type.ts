import { Role, User, UserRole } from "src/modules/users/entities";

/**
 ** Type
 */

export type TCheckActivationStepsEndedUserRole = Pick<UserRole, "id" | "isActive"> & {
  user: Pick<User, "id" | "email">;
  role: Pick<Role, "name">;
};
