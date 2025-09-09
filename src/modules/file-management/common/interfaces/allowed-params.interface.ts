import { EContentType } from "src/modules/file-management/common/enums";

export interface IAllowedParams {
  fileSizeLimitMB: number;
  possibleContentTypes: EContentType[];
}
