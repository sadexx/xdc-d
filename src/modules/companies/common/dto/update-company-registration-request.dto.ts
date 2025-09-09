import {
  IsEmail,
  IsEnum,
  IsLowercase,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  Length,
  MinLength,
} from "class-validator";
import { ECompanyActivitySphere, ECompanyEmployeesNumber, ECompanyType } from "src/modules/companies/common/enums";
import { EExtCountry } from "src/modules/addresses/common/enums";
import { NoWhitespaces } from "src/common/decorators";

export class UpdateCompanyRegistrationRequestDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  contactPerson?: string;

  @IsOptional()
  @NoWhitespaces()
  @IsPhoneNumber()
  phoneNumber?: string;

  @IsOptional()
  @IsEmail()
  @IsLowercase()
  @MinLength(6)
  contactEmail?: string;

  @IsOptional()
  @IsEnum(ECompanyActivitySphere)
  activitySphere?: ECompanyActivitySphere;

  @IsOptional()
  @IsEnum(ECompanyEmployeesNumber)
  employeesNumber?: ECompanyEmployeesNumber;

  @IsOptional()
  @IsEnum(ECompanyType)
  companyType?: ECompanyType;

  @IsOptional()
  @IsEnum(EExtCountry, {
    message: "Country must be one of the following: " + Object.values(EExtCountry).join(", "),
  })
  country?: EExtCountry;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  adminName?: string;

  @IsOptional()
  @IsEmail()
  @IsLowercase()
  @MinLength(6)
  adminEmail?: string;
}
