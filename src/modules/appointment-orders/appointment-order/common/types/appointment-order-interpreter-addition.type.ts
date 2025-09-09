import { FindOptionsRelations, FindOptionsSelect } from "typeorm";
import { QueryResultType } from "src/common/types";
import { UserRole } from "src/modules/users/entities";

/**
 ** Query types
 */

export const GetInterpretersQuery = {
  select: {
    id: true,
    user: { platformId: true },
    interpreterProfile: { isTemporaryBlocked: true },
  } as const satisfies FindOptionsSelect<UserRole>,
  relations: { user: true, interpreterProfile: true } as const satisfies FindOptionsRelations<UserRole>,
};
export type TGetInterpreters = QueryResultType<UserRole, typeof GetInterpretersQuery.select>;
