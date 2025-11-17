import { FindOptionsSelect, FindOptionsRelations } from "typeorm";
import { QueryResultType } from "src/common/types";
import { Role, User, UserRole } from "src/modules/users/entities";

/**
 ** Type
 */

export type THandleRoleBasedLogin = Pick<User, "id" | "email"> & {
  userRoles: (Pick<
    UserRole,
    | "id"
    | "userId"
    | "operatedByCompanyId"
    | "operatedByCompanyName"
    | "isInDeleteWaiting"
    | "accountStatus"
    | "isActive"
    | "isRequiredInfoFulfilled"
  > & {
    role: Pick<Role, "name">;
  })[];
};

/**
 ** Query types
 */

export const VerifyUserAuthorizationQuery = {
  select: {
    id: true,
    password: true,
    email: true,
    userRoles: {
      id: true,
      isRegistrationFinished: true,
      userId: true,
      operatedByCompanyId: true,
      operatedByCompanyName: true,
      isActive: true,
      isRequiredInfoFulfilled: true,
      isInDeleteWaiting: true,
      accountStatus: true,
      role: { name: true },
    },
  } as const satisfies FindOptionsSelect<User>,
  relations: { userRoles: { role: true } } as const satisfies FindOptionsRelations<User>,
};
export type TVerifyUserAuthorization = QueryResultType<User, typeof VerifyUserAuthorizationQuery.select>;

export const RefreshTokensQuery = {
  select: {
    id: true,
    userId: true,
    isInDeleteWaiting: true,
    accountStatus: true,
    operatedByCompanyId: true,
    operatedByCompanyName: true,
    isActive: true,
    isRequiredInfoFulfilled: true,
    role: { name: true },
  } as const satisfies FindOptionsSelect<UserRole>,
  relations: { role: true } as const satisfies FindOptionsRelations<UserRole>,
};
export type TRefreshTokens = QueryResultType<UserRole, typeof RefreshTokensQuery.select>;

export const SelectRoleQuery = {
  select: {
    id: true,
    isRegistrationFinished: true,
    isInDeleteWaiting: true,
    userId: true,
    operatedByCompanyId: true,
    operatedByCompanyName: true,
    accountStatus: true,
    isActive: true,
    isRequiredInfoFulfilled: true,
    role: { name: true },
    user: {
      id: true,
      email: true,
      userRoles: { id: true, isUserAgreedToTermsAndConditions: true, role: { name: true } },
    },
  } as const satisfies FindOptionsSelect<UserRole>,
  relations: { role: true, user: { userRoles: { role: true } } } as const satisfies FindOptionsRelations<UserRole>,
};
export type TSelectRole = QueryResultType<UserRole, typeof SelectRoleQuery.select>;
