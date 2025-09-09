import { ValuesOf } from "src/common/types";

export const EPromoCampaignBannerType = {
  MOBILE: "mobile",
  TABLET: "tablet",
  WEB: "web",
} as const;

export type EPromoCampaignBannerType = ValuesOf<typeof EPromoCampaignBannerType>;
