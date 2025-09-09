import { FindOptionsSelect } from "typeorm";
import { NonNullableProperties, QueryResultType } from "src/common/types";
import { PromoCampaignBanner } from "src/modules/promo-campaigns/entities";
import { UploadPromoCampaignBannerDto } from "src/modules/promo-campaigns/common/dto";

/**
 ** Type
 */

export type TUpdatePromoCampaignBannerDto = NonNullableProperties<UploadPromoCampaignBannerDto, "bannerId">;

/**
 ** Query types
 */

export const UpdatePromoCampaignBannerQuery = {
  select: {
    id: true,
    mobileBannerUrl: true,
    tabletBannerUrl: true,
    webBannerUrl: true,
  } as const satisfies FindOptionsSelect<PromoCampaignBanner>,
};
export type TUpdatePromoCampaignBanner = QueryResultType<
  PromoCampaignBanner,
  typeof UpdatePromoCampaignBannerQuery.select
>;

export const RemoveUnusedPromoCampaignBannersQuery = {
  select: {
    id: true,
    mobileBannerUrl: true,
    tabletBannerUrl: true,
    webBannerUrl: true,
  } as const satisfies FindOptionsSelect<PromoCampaignBanner>,
};
export type TRemoveUnusedPromoCampaignBanners = QueryResultType<
  PromoCampaignBanner,
  typeof RemoveUnusedPromoCampaignBannersQuery.select
>;
