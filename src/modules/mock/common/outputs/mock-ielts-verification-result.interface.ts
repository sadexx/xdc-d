import { IMockAnswerResult } from "src/modules/mock/common/outputs";
import { IResultVerification } from "src/modules/ielts/common/interfaces";

export interface IMockIeltsVerificationResult extends IMockAnswerResult {
  result: IResultVerification;
}
