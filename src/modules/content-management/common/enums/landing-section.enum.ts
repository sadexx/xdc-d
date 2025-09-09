import { ValuesOf } from "src/common/types";

export const ELandingSection = {
  PROMO: "promo",
  LFH_WORK: "lfh-work",
  LANGUAGE_SPECIALISTS: "language-specialists",
  KEYS: "keys",
  WORK_WITH_US: "work-with-us",
  COMPANY_VALUES: "company-values",
  SOCIAL_MEDIA: "social-media",
} as const;

export type ELandingSection = ValuesOf<typeof ELandingSection>;
