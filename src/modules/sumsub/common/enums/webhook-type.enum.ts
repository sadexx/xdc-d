import { ValuesOf } from "src/common/types";

export const EExtSumSubWebhookType = {
  APPLICANT_REVIEWED: "applicantReviewed",
  APPLICANT_PENDING: "applicantPending",
  APPLICANT_CREATED: "applicantCreated",
  APPLICANT_ON_HOLD: "applicantOnHold",
  APPLICANT_PERSONAL_INFO_CHANGED: "applicantPersonalInfoChanged",
  APPLICANT_PRECHECKED: "applicantPrechecked",
  APPLICANT_DELETED: "applicantDeleted",
  APPLICANT_LEVEL_CHANGED: "applicantLevelChanged",
  VIDEO_IDENT_STATUS_CHANGED: "videoIdentStatusChanged",
  APPLICANT_RESET: "applicantReset",
  APPLICANT_ACTION_PENDING: "applicantActionPending",
  APPLICANT_ACTION_REVIEWED: "applicantActionReviewed",
  APPLICANT_ACTION_ON_HOLD: "applicantActionOnHold",
  APPLICANT_TRAVEL_RULE_STATUS_CHANGED: "applicantTravelRuleStatusChanged",
  APPLICANT_WORKFLOW_COMPLETED: "applicantWorkflowCompleted",
} as const;

export type EExtSumSubWebhookType = ValuesOf<typeof EExtSumSubWebhookType>;
