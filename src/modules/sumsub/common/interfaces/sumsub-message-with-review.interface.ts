import { IBaseSumSubMessage, ISumSubReviewResult } from "src/modules/sumsub/common/interfaces";

export interface ISumSubMessageWithReview extends IBaseSumSubMessage {
  reviewResult?: ISumSubReviewResult;
}
