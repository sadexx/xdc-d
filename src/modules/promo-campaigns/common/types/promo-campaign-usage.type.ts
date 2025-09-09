import { FindOptionsRelations, FindOptionsSelect } from "typeorm";
import { QueryResultType } from "src/common/types";
import { PromoCampaign, PromoCampaignAssignment } from "src/modules/promo-campaigns/entities";

/**
 ** Type
 */

export type TFetchPromoCampaignDiscount = Pick<
  PromoCampaignAssignment,
  "id" | "lastUsedDate" | "discountMinutes" | "remainingUses" | "discount"
> & {
  promoCampaign: Pick<PromoCampaign, "id" | "application" | "discountMinutes" | "promoCode" | "usageLimit">;
};

export type TApplyPromoCampaignUsage = Pick<
  PromoCampaignAssignment,
  "id" | "remainingUses" | "lastUsedDate" | "discountMinutes"
> & {
  promoCampaign: Pick<PromoCampaign, "id" | "usageLimit" | "application" | "discountMinutes">;
};

export type TShouldResetDailyLimits = Pick<PromoCampaign, "application">;

/**
 ** Query types
 */

export const ApplyPromoCampaignUsageForExtensionQuery = {
  select: {
    id: true,
    discountMinutes: true,
    remainingUses: true,
    lastUsedDate: true,
    promoCampaign: { id: true, application: true, discountMinutes: true, usageLimit: true },
  } as const satisfies FindOptionsSelect<PromoCampaignAssignment>,
  relations: { promoCampaign: true } as const satisfies FindOptionsRelations<PromoCampaignAssignment>,
};
export type TApplyPromoCampaignUsageForExtension = QueryResultType<
  PromoCampaignAssignment,
  typeof ApplyPromoCampaignUsageForExtensionQuery.select
>;
