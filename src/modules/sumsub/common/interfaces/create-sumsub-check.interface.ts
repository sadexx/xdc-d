import { UserRole } from "src/modules/users/entities";
import {
  EExtSumSubApplicantType,
  EExtSumSubLevelName,
  EExtSumSubReviewAnswer,
  EExtSumSubReviewRejectType,
  EExtSumSubReviewStatus,
  EExtSumSubWebhookType,
} from "src/modules/sumsub/common/enums";

export interface ICreateSumSubCheck {
  userRole: UserRole;
  applicantId: string;
  inspectionId: string;
  applicantType: EExtSumSubApplicantType;
  correlationId: string;
  levelName: EExtSumSubLevelName;
  sandboxMode: boolean;
  externalUserId: string;
  webhookType: EExtSumSubWebhookType;
  reviewStatus: EExtSumSubReviewStatus;
  moderationComment: string | null;
  clientComment: string | null;
  reviewAnswer: EExtSumSubReviewAnswer | null;
  rejectLabels: string[];
  reviewRejectType: EExtSumSubReviewRejectType | null;
  buttonIds: string[];
}
