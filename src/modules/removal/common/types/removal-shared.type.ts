import { FindOptionsRelations, FindOptionsSelect } from "typeorm";
import { QueryResultType } from "src/common/types";
import { UserProfile, UserRole } from "src/modules/users/entities";
import { Company } from "src/modules/companies/entities";

/**
 ** Type
 */

export type TResolveEmailRecipient = Pick<UserRole, "id" | "operatedByCompanyId"> & {
  profile: Pick<UserProfile, "contactEmail">;
};

/**
 ** Query types
 */

export const ResolveEmailRecipientAdminQuery = {
  select: {
    id: true,
    operatedByCompanyId: true,
    profile: { contactEmail: true },
  } as const satisfies FindOptionsSelect<UserRole>,
  relations: { profile: true } as const satisfies FindOptionsRelations<UserRole>,
};
export type TResolveEmailRecipientAdmin = QueryResultType<UserRole, typeof ResolveEmailRecipientAdminQuery.select>;

export const ResolveEmailRecipientCompanyQuery = {
  select: { id: true, operatedByMainCompanyId: true } as const satisfies FindOptionsSelect<Company>,
};
export type TResolveEmailRecipientCompany = QueryResultType<Company, typeof ResolveEmailRecipientCompanyQuery.select>;
