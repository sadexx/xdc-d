import { FindOptionsRelations, FindOptionsSelect } from "typeorm";
import { QueryResultType } from "src/common/types";
import { Role, User, UserRole } from "src/modules/users/entities";
import { EUserRoleName } from "src/modules/users/common/enums";

/**
 ** Type
 */

export type TConstructAndCreateUserRoleUser = Pick<User, "id">;

export type TSetupUserForRegistrationLink = {
  email: string;
  role: EUserRoleName;
  phoneNumber?: string;
};

/**
 ** Query types
 */

export const ConstructAndCreateUserRoleQuery = {
  select: {
    id: true,
  } as const satisfies FindOptionsSelect<Role>,
};
export type TConstructAndCreateUserRole = QueryResultType<Role, typeof ConstructAndCreateUserRoleQuery.select>;

export const AddNewUserRoleQuery = {
  select: {
    id: true,
    email: true,
    userRoles: {
      id: true,
      isRegistrationFinished: true,
      role: {
        id: true,
        name: true,
      },
    },
  } as const satisfies FindOptionsSelect<User>,
  relations: { userRoles: { role: true } } as const satisfies FindOptionsRelations<User>,
};
export type TAddNewUserRole = QueryResultType<User, typeof AddNewUserRoleQuery.select>;

export const ProcessUserRegistrationLinkQuery = {
  select: {
    id: true,
    email: true,
    phoneNumber: true,
    userRoles: { id: true, userId: true, role: { name: true } },
  } as const satisfies FindOptionsSelect<User>,
  relations: { userRoles: { role: true } } as const satisfies FindOptionsRelations<User>,
};
export type TProcessUserRegistrationLink = QueryResultType<User, typeof ProcessUserRegistrationLinkQuery.select>;

export const ProcessUserRegistrationLinkUserRoleQuery = {
  select: {
    id: true,
    operatedByCompanyId: true,
    operatedByMainCorporateCompanyId: true,
    userId: true,
    isRegistrationFinished: true,
    address: { id: true },
    profile: { id: true },
    user: { id: true, email: true, isDefaultAvatar: true, administratedCompany: { id: true } },
  } as const satisfies FindOptionsSelect<UserRole>,
  relations: {
    address: true,
    profile: true,
    user: { administratedCompany: true },
  } as const satisfies FindOptionsRelations<UserRole>,
};
export type TProcessUserRegistrationLinkUserRole = QueryResultType<
  UserRole,
  typeof ProcessUserRegistrationLinkUserRoleQuery.select
>;
