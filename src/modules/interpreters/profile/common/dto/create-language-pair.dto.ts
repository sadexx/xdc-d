import { Type } from "class-transformer";
import { IsArray, IsOptional, IsUUID, ValidateNested } from "class-validator";
import { LanguagePairDto } from "src/modules/interpreters/profile/common/dto";

export class CreateLanguagePairDto {
  @IsOptional()
  @IsUUID()
  userRoleId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LanguagePairDto)
  languagePairs: LanguagePairDto[];
}
