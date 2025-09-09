import { IMockAnswerResult } from "src/modules/mock/common/outputs";
import { IAbnMessageWithReview } from "src/modules/abn/common/interface";

export interface IMockGetAbnVerificationStatusResult extends IMockAnswerResult {
  result: IAbnMessageWithReview;
}
