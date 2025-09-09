import { IsEnum } from "class-validator";
import { ELandingUiLanguage } from "src/modules/content-management/common/enums";

export class GetOneContentByLanguageQueryDto {
  @IsEnum(ELandingUiLanguage)
  language: ELandingUiLanguage;
}
