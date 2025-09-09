import { FindOptionsRelations, FindOptionsSelect } from "typeorm";
import { QueryResultType } from "src/common/types";
import { User, UserRole } from "src/modules/users/entities";
import { Company } from "src/modules/companies/entities";

/**
 ** Query types
 */

export const RemoveUsersQuery = {
  select: {
    id: true,
    userRoles: { id: true, isInDeleteWaiting: true, deletingDate: true, role: { name: true } },
    administratedCompany: {
      id: true,
      superAdminId: true,
      removeAllAdminRoles: true,
      superAdmin: {
        id: true,
        userRoles: { id: true, role: { name: true } },
      },
    },
  } as const satisfies FindOptionsSelect<User>,
  relations: {
    userRoles: { role: true },
    administratedCompany: { superAdmin: { userRoles: { role: true } } },
  } as const satisfies FindOptionsRelations<User>,
};
export type TRemoveUsers = QueryResultType<User, typeof RemoveUsersQuery.select>;

export const RemoveUserRolesQuery = {
  select: {
    id: true,
    userId: true,
    user: {
      id: true,
      administratedCompany: {
        id: true,
        superAdminId: true,
        removeAllAdminRoles: true,
        superAdmin: { id: true, userRoles: { id: true, role: { name: true } } },
      },
      userRoles: { id: true },
    },
    role: { name: true },
  } as const satisfies FindOptionsSelect<UserRole>,
  relations: {
    user: { administratedCompany: { superAdmin: { userRoles: { role: true } } }, userRoles: true },
    role: true,
  } as const satisfies FindOptionsRelations<UserRole>,
};
export type TRemoveUserRoles = QueryResultType<UserRole, typeof RemoveUserRolesQuery.select>;

export const RemoveUnfinishedRegistrationUserRolesQuery = {
  select: {
    id: true,
    userId: true,
    user: {
      id: true,
      administratedCompany: {
        id: true,
        superAdminId: true,
        removeAllAdminRoles: true,
        superAdmin: { id: true, userRoles: { id: true, role: { name: true } } },
      },
      userRoles: { id: true },
    },
    role: { name: true },
  } as const satisfies FindOptionsSelect<UserRole>,
  relations: {
    user: { administratedCompany: { superAdmin: { userRoles: { role: true } } }, userRoles: true },
    role: true,
  } as const satisfies FindOptionsRelations<UserRole>,
};
export type TRemoveUnfinishedRegistrationUserRoles = QueryResultType<
  UserRole,
  typeof RemoveUnfinishedRegistrationUserRolesQuery.select
>;

export const RemoveCompaniesQuery = {
  select: {
    id: true,
    superAdminId: true,
    removeAllAdminRoles: true,
    superAdmin: { id: true, userRoles: { id: true, role: { name: true } } },
  } as const satisfies FindOptionsSelect<Company>,
  relations: { superAdmin: { userRoles: { role: true } } } as const satisfies FindOptionsRelations<Company>,
};
export type TRemoveCompanies = QueryResultType<Company, typeof RemoveCompaniesQuery.select>;
