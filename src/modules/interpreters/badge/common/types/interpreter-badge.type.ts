import { FindOptionsSelect, FindOptionsRelations } from "typeorm";
import { NonNullableProperties, QueryResultType } from "src/common/types";
import { UserRole } from "src/modules/users/entities";

/**
 ** Type
 */
export type TCreateOrUpdateInterpreterBadgePdf = TBaseCreateOrUpdateInterpreterBadgePdf & {
  interpreterProfile: NonNullableProperties<
    NonNullable<TBaseCreateOrUpdateInterpreterBadgePdf["interpreterProfile"]>,
    "interpreterBadge"
  >;
  user: NonNullableProperties<NonNullable<TBaseCreateOrUpdateInterpreterBadgePdf["user"]>, "avatarUrl">;
};

/**
 ** Query types
 */

export const CreateOrUpdateInterpreterBadgePdfQuery = {
  select: {
    id: true,
    operatedByCompanyId: true,
    operatedByCompanyName: true,
    role: { name: true },
    interpreterProfile: { interpreterBadge: true, averageRating: true },
    profile: { title: true, preferredName: true, firstName: true, lastName: true },
    user: { platformId: true, avatarUrl: true },
  } as const satisfies FindOptionsSelect<UserRole>,
  relations: {
    role: true,
    interpreterProfile: true,
    profile: true,
    user: true,
  } as const satisfies FindOptionsRelations<UserRole>,
};
type TBaseCreateOrUpdateInterpreterBadgePdf = QueryResultType<
  UserRole,
  typeof CreateOrUpdateInterpreterBadgePdfQuery.select
>;
