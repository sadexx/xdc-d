import { FindOptionsRelations, FindOptionsSelect } from "typeorm";
import { QueryResultType } from "src/common/types";
import { User, UserRole } from "src/modules/users/entities";

/**
 ** Query types
 */

export const RemoveUserRequestQuery = {
  select: {
    id: true,
    userRoles: {
      id: true,
      accountStatus: true,
      operatedByCompanyId: true,
      operatedByCompanyName: true,
      profile: { contactEmail: true, firstName: true, lastName: true, preferredName: true },
      user: { id: true, platformId: true },
      role: { name: true },
    },
    administratedCompany: {
      id: true,
      removeAllAdminRoles: true,
      superAdminId: true,
      superAdmin: { id: true, userRoles: { id: true, role: { name: true } } },
    },
  } as const satisfies FindOptionsSelect<User>,
  relations: {
    userRoles: { profile: true, user: true, role: true },
    administratedCompany: { superAdmin: { userRoles: { role: true } } },
  } as const satisfies FindOptionsRelations<User>,
};
export type TRemoveUserRequest = QueryResultType<User, typeof RemoveUserRequestQuery.select>;

export const RemoveUserRoleRequestQuery = {
  select: {
    id: true,
    userId: true,
    accountStatus: true,
    operatedByCompanyId: true,
    operatedByCompanyName: true,
    operatedByMainCorporateCompanyId: true,
    user: {
      id: true,
      platformId: true,
      administratedCompany: {
        id: true,
        removeAllAdminRoles: true,
        superAdminId: true,
        superAdmin: { id: true, userRoles: { id: true, role: { name: true } } },
      },
      userRoles: { id: true },
    },
    role: { name: true },
    profile: {
      contactEmail: true,
      firstName: true,
      lastName: true,
      preferredName: true,
    },
  } as const satisfies FindOptionsSelect<UserRole>,
  relations: {
    user: { administratedCompany: { superAdmin: { userRoles: { role: true } } }, userRoles: true },
    role: true,
    profile: true,
  } as const satisfies FindOptionsRelations<UserRole>,
};
export type TRemoveUserRoleRequest = QueryResultType<UserRole, typeof RemoveUserRoleRequestQuery.select>;
