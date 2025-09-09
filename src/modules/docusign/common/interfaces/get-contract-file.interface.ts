import { EContentType } from "src/modules/file-management/common/enums";

export interface IGetContractFileInterface {
  data: ReadableStream;
  contentType: EContentType;
  contentLength: number;
}
