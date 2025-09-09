import { User, UserProfile, UserRole } from "src/modules/users/entities";
import { Address } from "src/modules/addresses/entities";

/**
 ** Type
 */

export type TGenerateMembershipInvoiceUserRole = Pick<UserRole, "id" | "country"> & {
  address: Pick<Address, "id" | "streetNumber" | "streetName" | "suburb" | "state" | "postcode"> | null;
  profile: Pick<UserProfile, "id" | "firstName" | "lastName">;
  user: Pick<User, "id" | "platformId">;
};
