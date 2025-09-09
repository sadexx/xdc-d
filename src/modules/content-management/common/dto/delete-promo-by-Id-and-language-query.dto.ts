import { IsEnum, IsUUID } from "class-validator";
import { ELandingUiLanguage } from "src/modules/content-management/common/enums";

export class DeletePromoByIdAndLanguageQueryDto {
  @IsUUID()
  id: string;

  @IsEnum(ELandingUiLanguage)
  language: ELandingUiLanguage;
}
