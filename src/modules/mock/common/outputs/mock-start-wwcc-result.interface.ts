import { IMockAnswerResult } from "src/modules/mock/common/outputs";
import { IStartWwccResOutput } from "src/modules/backy-check/common/outputs";

export interface IMockStartWWCCResult extends IMockAnswerResult {
  result: IStartWwccResOutput;
}
