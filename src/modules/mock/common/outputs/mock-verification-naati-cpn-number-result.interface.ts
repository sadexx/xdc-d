import { IMockAnswerResult } from "src/modules/mock/common/outputs";
import { INaatiApiResponseOutput } from "src/modules/naati/common/outputs";

export interface IMockVerificationNaatiCpnNumberResult extends IMockAnswerResult {
  result: INaatiApiResponseOutput;
}
