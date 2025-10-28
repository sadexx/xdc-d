import { FindOptionsRelations, FindOptionsSelect } from "typeorm";
import { QueryResultType } from "src/common/types";
import { User, UserRole } from "src/modules/users/entities";
import { Company } from "src/modules/companies/entities";

/**
 ** Query types
 */

export const RestoreByRestorationKeyUserQuery = {
  select: { id: true, administratedCompany: { id: true } } as const satisfies FindOptionsSelect<User>,
  relations: { administratedCompany: true } as const satisfies FindOptionsRelations<User>,
};
export type TRestoreByRestorationKeyUser = QueryResultType<User, typeof RestoreByRestorationKeyUserQuery.select>;

export const RestoreByRestorationKeyUserRoleQuery = {
  select: {
    id: true,
    user: { id: true, administratedCompany: { id: true } },
  } as const satisfies FindOptionsSelect<UserRole>,
  relations: { user: { administratedCompany: true } } as const satisfies FindOptionsRelations<UserRole>,
};
export type TRestoreByRestorationKeyUserRole = QueryResultType<
  UserRole,
  typeof RestoreByRestorationKeyUserRoleQuery.select
>;

export const RestoreCompanyEntityQuery = {
  select: { id: true, isInDeleteWaiting: true } as const satisfies FindOptionsSelect<Company>,
};
export type TRestoreCompanyEntity = QueryResultType<Company, typeof RestoreCompanyEntityQuery.select>;
