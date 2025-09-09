import { IMockAnswerResult } from "src/modules/mock/common/outputs";
import { IMessageOutput } from "src/common/outputs";

export interface IMockPhoneNumberSendResult extends IMockAnswerResult {
  result: IMessageOutput | null;
}
