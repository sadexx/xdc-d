import { ETermsDocumentType } from "src/modules/file-management/common/enums";
import { IsEnum } from "class-validator";
import { TermsDownloadParamDto } from "src/modules/file-management/common/dto";

export class TermsUploadParamDto extends TermsDownloadParamDto {
  @IsEnum(ETermsDocumentType)
  documentType: ETermsDocumentType;
}
