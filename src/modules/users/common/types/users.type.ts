import { FindOptionsRelations, FindOptionsSelect } from "typeorm";
import { QueryResultType } from "src/common/types";
import { Role, User, UserRole } from "src/modules/users/entities";
import { Company } from "src/modules/companies/entities";

/**
 ** Type
 */

export type TIsUserNotDeletedAndNotDeactivated = Pick<
  UserRole,
  "userId" | "operatedByCompanyId" | "operatedByCompanyName" | "isInDeleteWaiting" | "accountStatus"
> & {
  role: Pick<Role, "name">;
};

/**
 ** Query types
 */

export const GetCurrentUserQuery = {
  select: {} as const satisfies FindOptionsSelect<User>,
  relations: { userRoles: { role: true } } as const satisfies FindOptionsRelations<User>,
};
export type TGetCurrentUser = QueryResultType<User, typeof GetCurrentUserQuery.select>;

export const ChangeRegisteredPasswordQuery = {
  select: {
    id: true,
    password: true,
  } as const satisfies FindOptionsSelect<User>,
};
export type TChangeRegisteredPassword = QueryResultType<User, typeof ChangeRegisteredPasswordQuery.select>;

export const ІsUserNotDeletedAndNotDeactivatedCompanyQuery = {
  select: {
    id: true,
    isInDeleteWaiting: true,
    status: true,
  } as const satisfies FindOptionsSelect<Company>,
};
export type TІsUserNotDeletedAndNotDeactivatedCompany = QueryResultType<
  Company,
  typeof ІsUserNotDeletedAndNotDeactivatedCompanyQuery.select
>;
