import { ValuesOf } from "src/common/types";

export const EPromoCampaignTarget = {
  GENERAL: "general",
  PERSONAL: "personal",
  CORPORATE_COMPANY: "corporate-company",
  ALL_NEW_PERSONAL: "all-new-personal",
} as const;

export type EPromoCampaignTarget = ValuesOf<typeof EPromoCampaignTarget>;

export const promoCampaignTargetOrder = {
  [EPromoCampaignTarget.GENERAL]: 1,
  [EPromoCampaignTarget.PERSONAL]: 2,
  [EPromoCampaignTarget.ALL_NEW_PERSONAL]: 3,
  [EPromoCampaignTarget.CORPORATE_COMPANY]: 4,
} as const satisfies Record<EPromoCampaignTarget, number>;
