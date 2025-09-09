import { ValuesOf } from "src/common/types";

export const EOnboardingStatus = {
  ACCOUNT_CREATED: "account-created",
  ONBOARDING_STARTED: "onboarding-started",
  NEED_DOCUMENTS: "need-documents",
  DOCUMENTS_PENDING: "documents-pending",
  ONBOARDING_SUCCESS: "onboarding-success",
  INCORRECT_COUNTRY: "incorrect-country",
} as const;

export type EOnboardingStatus = ValuesOf<typeof EOnboardingStatus>;
