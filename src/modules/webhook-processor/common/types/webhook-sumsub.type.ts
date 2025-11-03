import { FindOptionsSelect, FindOptionsRelations } from "typeorm";
import { QueryResultType } from "src/common/types";
import { UserRole } from "src/modules/users/entities";
import { SumSubCheck } from "src/modules/sumsub/entities";

/**
 ** Query types
 */

export const ProcessSumSubWebhookUserRoleQuery = {
  select: {
    id: true,
    isActive: true,
    profile: { firstName: true, lastName: true },
    role: { name: true },
    user: { id: true, email: true },
  } as const satisfies FindOptionsSelect<UserRole>,
  relations: { profile: true, role: true, user: true } as const satisfies FindOptionsRelations<UserRole>,
};
export type TProcessSumSubWebhookUserRole = QueryResultType<UserRole, typeof ProcessSumSubWebhookUserRoleQuery.select>;

export const ProcessSumSubWebhookCheckQuery = {
  select: {
    id: true,
  } as const satisfies FindOptionsSelect<SumSubCheck>,
};
export type TProcessSumSubWebhookCheck = QueryResultType<SumSubCheck, typeof ProcessSumSubWebhookCheckQuery.select>;
