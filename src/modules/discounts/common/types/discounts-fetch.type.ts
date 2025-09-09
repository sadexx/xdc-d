import { FindOptionsRelations, FindOptionsSelect } from "typeorm";
import { QueryResultType } from "src/common/types";
import { DiscountHolder } from "src/modules/discounts/entities";
import { IMembershipDiscountData } from "src/modules/memberships/common/interfaces";
import { IPromoCampaignDiscountData } from "src/modules/promo-campaigns/common/interfaces";

/**
 ** Type
 */

export type TDiscountResult = IMembershipDiscountData | IPromoCampaignDiscountData;

/**
 ** Query types
 */

export const GetAssignedDiscountEntitiesQuery = {
  select: {
    id: true,
    membershipAssignment: {
      id: true,
      status: true,
      startDate: true,
      endDate: true,
      preBookedMinutes: true,
      onDemandMinutes: true,
      currentMembership: { status: true },
    },
    promoCampaignAssignment: {
      id: true,
      lastUsedDate: true,
      discountMinutes: true,
      remainingUses: true,
      discount: true,
      promoCampaign: {
        id: true,
        status: true,
        endDate: true,
        application: true,
        discountMinutes: true,
        promoCode: true,
        communicationTypes: true,
        schedulingTypes: true,
        topics: true,
        interpreterTypes: true,
        interpretingTypes: true,
      },
    },
  } as const satisfies FindOptionsSelect<DiscountHolder>,
  relations: {
    membershipAssignment: { currentMembership: true },
    promoCampaignAssignment: { promoCampaign: true },
  } as const satisfies FindOptionsRelations<DiscountHolder>,
};
export type TGetAssignedDiscountEntities = QueryResultType<
  DiscountHolder,
  typeof GetAssignedDiscountEntitiesQuery.select
>;
