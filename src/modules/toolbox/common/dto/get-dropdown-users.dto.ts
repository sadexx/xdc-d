import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";
import { EUserRoleName } from "src/modules/users/common/enums";
import { CommaSeparatedToArray } from "src/common/decorators";
import { ELanguages } from "src/modules/interpreters/profile/common/enum";

export class GetDropdownUsersDto {
  @CommaSeparatedToArray()
  @IsEnum(EUserRoleName, { each: true })
  roles: EUserRoleName[];

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  searchField?: string;

  @IsOptional()
  @IsUUID()
  operatedByCompanyId?: string;

  @IsOptional()
  @IsEnum(ELanguages)
  languageFrom?: ELanguages;

  @IsOptional()
  @IsEnum(ELanguages)
  languageTo?: ELanguages;
}
