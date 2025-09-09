import { EUserRoleName } from "src/modules/users/common/enums";

/**
 * Type-safe helper to check if a role exists in a readonly array of roles
 * @param roles - Array of roles to check against
 * @param role - Role to check
 * @returns Type predicate indicating if role is in the array
 */
export function isInRoles<T extends readonly EUserRoleName[]>(roles: T, role: EUserRoleName): role is T[number] {
  return (roles as readonly EUserRoleName[]).includes(role);
}
