import {
  EExtSumSubApplicantType,
  EExtSumSubLevelName,
  EExtSumSubReviewStatus,
  EExtSumSubWebhookType,
} from "src/modules/sumsub/common/enums";

export interface IBaseSumSubMessage {
  applicantId: string;
  inspectionId: string;
  applicantType: EExtSumSubApplicantType;
  correlationId: string;
  levelName: EExtSumSubLevelName;
  sandboxMode?: boolean;
  externalUserId: string;
  type: EExtSumSubWebhookType;
  reviewStatus: EExtSumSubReviewStatus;
  createdAt: string;
  createdAtMs: string;
  clientId: string;
}
