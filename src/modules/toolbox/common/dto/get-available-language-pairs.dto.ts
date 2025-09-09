import { IsEnum } from "class-validator";
import { ELanguages } from "src/modules/interpreters/profile/common/enum";

export class GetAvailableLanguagePairsDto {
  @IsEnum(ELanguages)
  language: ELanguages;
}
