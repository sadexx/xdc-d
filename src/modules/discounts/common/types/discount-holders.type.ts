import { FindOptionsRelations, FindOptionsSelect } from "typeorm";
import { QueryResultType } from "src/common/types";
import { Company } from "src/modules/companies/entities";
import { UserRole } from "src/modules/users/entities";
import { MembershipAssignment } from "src/modules/memberships/entities";
import { PromoCampaignAssignment } from "src/modules/promo-campaigns/entities";
import { DiscountHolder } from "src/modules/discounts/entities";

/**
 ** Type
 */

export type DiscountEntityHolder = Pick<UserRole, "id"> | Pick<Company, "id">;

export type DiscountEntity = PromoCampaignAssignment | MembershipAssignment;

/**
 ** Query types
 */

export const CreateOrUpdateDiscountHolderQuery = {
  select: {
    id: true,
    promoCampaignAssignment: { id: true },
    membershipAssignment: { id: true },
  } as const satisfies FindOptionsSelect<DiscountHolder>,
  relations: {
    promoCampaignAssignment: true,
    membershipAssignment: true,
  } as const satisfies FindOptionsRelations<DiscountHolder>,
};
export type TCreateOrUpdateDiscountHolder = QueryResultType<
  DiscountHolder,
  typeof CreateOrUpdateDiscountHolderQuery.select
>;
