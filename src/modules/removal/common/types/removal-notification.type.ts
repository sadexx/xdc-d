import { UserRole } from "src/modules/users/entities";
import { User, UserProfile } from "src/modules/users/entities";

/**
 ** Type
 */

export type TSendUserRemovalRequestEmail = Pick<UserRole, "id" | "operatedByCompanyName"> & {
  user: Pick<User, "id" | "platformId">;
  profile: Pick<UserProfile, "firstName" | "lastName" | "preferredName" | "contactEmail">;
};
