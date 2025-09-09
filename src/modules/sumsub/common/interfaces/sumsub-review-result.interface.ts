import { EExtSumSubReviewAnswer, EExtSumSubReviewRejectType } from "src/modules/sumsub/common/enums";

export interface ISumSubReviewResult {
  moderationComment?: string;
  clientComment?: string;
  reviewAnswer: EExtSumSubReviewAnswer;
  rejectLabels?: string[];
  reviewRejectType?: EExtSumSubReviewRejectType;
  buttonIds?: string[];
}
