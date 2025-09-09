import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsISO8601,
  IsLowercase,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { EUserGender, EUserTitle } from "src/modules/users/common/enums";
import { ELanguages } from "src/modules/interpreters/profile/common/enum";

export class CreateUserProfileInformationDto {
  @IsOptional()
  @IsEnum(EUserTitle)
  title?: EUserTitle;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  middleName?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  preferredName?: string;

  @IsNotEmpty()
  @IsISO8601()
  dateOfBirth: string;

  @IsEnum(EUserGender)
  gender: EUserGender;

  @IsOptional()
  @IsEmail()
  @IsLowercase()
  @MinLength(6)
  contactEmail?: string;

  @IsOptional()
  @IsEnum(ELanguages)
  nativeLanguage?: ELanguages;

  @IsOptional()
  @IsBoolean()
  isIdentifyAsAboriginalOrTorresStraitIslander?: boolean;
}
