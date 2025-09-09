import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";
import { ELanguages } from "src/modules/interpreters/profile/common/enum";
import { IsLanguageCheckDataValid } from "src/modules/language-doc-check/common/validators";

export class CreateLanguageDocCheckDto {
  @IsOptional()
  @IsUUID()
  userRoleId?: string;

  @IsOptional()
  @IsEnum(ELanguages)
  @IsLanguageCheckDataValid()
  language?: ELanguages;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(50)
  pteTestRegistrationId?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(50)
  pteScoreReportCode?: string;
}
