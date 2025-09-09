import { FindOptionsRelations, FindOptionsSelect } from "typeorm";
import { QueryResultType } from "src/common/types";
import { Company } from "src/modules/companies/entities";
import { User } from "src/modules/users/entities";

/**
 ** Type
 */

export type TSendCompanyActivationEmail = Pick<User, "id" | "email">;

/**
 ** Query types
 */

export const CompanyActivationQuery = {
  select: {
    id: true,
    operatedByMainCompanyId: true,
    isActive: true,
    adminName: true,
    superAdmin: { id: true, email: true, userRoles: { id: true, role: { name: true } } },
  } as const satisfies FindOptionsSelect<Company>,
  relations: { superAdmin: { userRoles: { role: true } } } as const satisfies FindOptionsRelations<Company>,
};
export type TCompanyActivation = QueryResultType<Company, typeof CompanyActivationQuery.select>;
