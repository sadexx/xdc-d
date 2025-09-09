import { IsOptional, IsNotEmpty, IsString, IsEnum } from "class-validator";
import { CommaSeparatedToArray } from "src/common/decorators";
import { ESortOrder } from "src/common/enums";
import { ELanguages } from "src/modules/interpreters/profile/common/enum";
import { EAccountStatus, EUserGender, EUserRoleName } from "src/modules/users/common/enums";

export class GetCsvUsersDto {
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  searchField?: string;

  @IsOptional()
  @CommaSeparatedToArray()
  @IsEnum(EUserRoleName, { each: true })
  roles?: EUserRoleName[];

  @IsOptional()
  @CommaSeparatedToArray()
  @IsEnum(EAccountStatus, { each: true })
  statuses?: EAccountStatus[];

  @IsOptional()
  @CommaSeparatedToArray()
  @IsEnum(EUserGender, { each: true })
  genders?: EUserGender[];

  @IsOptional()
  @IsEnum(ELanguages)
  languageFrom?: ELanguages;

  @IsOptional()
  @IsEnum(ELanguages)
  languageTo?: ELanguages;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  country?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  state?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  suburb?: string;

  @IsOptional()
  @IsEnum(ESortOrder)
  sortOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  accountStatusOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  genderOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  languageOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  certificateTypeOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  languageLevelOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  nameOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  phoneNumberOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  emailOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  countryOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  stateOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  suburbOrder?: ESortOrder;
}
