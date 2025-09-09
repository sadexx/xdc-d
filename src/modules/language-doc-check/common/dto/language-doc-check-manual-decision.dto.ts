import { IsEnum, IsString, IsUUID } from "class-validator";
import { ELanguageDocCheckRequestStatus } from "src/modules/language-doc-check/common/enums";

export class LanguageDocCheckManualDecisionDto {
  @IsUUID()
  @IsString()
  id: string;

  @IsEnum(ELanguageDocCheckRequestStatus)
  @IsString()
  status: ELanguageDocCheckRequestStatus;
}
