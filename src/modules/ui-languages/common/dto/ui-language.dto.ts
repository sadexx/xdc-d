import { IsEnum } from "class-validator";
import { EPossibleUiLanguage } from "src/modules/ui-languages/common/enums";

export class LanguageParamDto {
  @IsEnum(EPossibleUiLanguage)
  language: EPossibleUiLanguage;
}
