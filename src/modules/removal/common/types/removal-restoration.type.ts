import { FindOptionsSelect } from "typeorm";
import { QueryResultType } from "src/common/types";
import { User, UserRole } from "src/modules/users/entities";
import { Company } from "src/modules/companies/entities";

/**
 ** Query types
 */

export const RestoreByRestorationKeyUserQuery = {
  select: { id: true } as const satisfies FindOptionsSelect<User>,
};
export type TRestoreByRestorationKeyUser = QueryResultType<User, typeof RestoreByRestorationKeyUserQuery.select>;

export const RestoreByRestorationKeyUserRoleQuery = {
  select: { id: true } as const satisfies FindOptionsSelect<UserRole>,
};
export type TRestoreByRestorationKeyUserRole = QueryResultType<
  UserRole,
  typeof RestoreByRestorationKeyUserRoleQuery.select
>;

export const RestoreCompanyEntityQuery = {
  select: { id: true, isInDeleteWaiting: true } as const satisfies FindOptionsSelect<Company>,
};
export type TRestoreCompanyEntity = QueryResultType<Company, typeof RestoreCompanyEntityQuery.select>;
