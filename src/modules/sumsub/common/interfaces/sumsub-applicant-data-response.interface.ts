import { IBaseSumSubMessage, ISumSubApplicantInfo } from "src/modules/sumsub/common/interfaces";

export interface ISumSubApplicantDataResponse extends IBaseSumSubMessage {
  info: ISumSubApplicantInfo;
}
