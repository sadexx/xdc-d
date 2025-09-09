import { IsEmail, IsEnum, IsLowercase, IsOptional, IsPhoneNumber, IsString, Length, MinLength } from "class-validator";
import { ECompanyActivitySphere, ECompanyEmployeesNumber, ECompanyType } from "src/modules/companies/common/enums";
import { EExtCountry } from "src/modules/addresses/common/enums";
import { NoWhitespaces } from "src/common/decorators";

export class CreateCompanyRegistrationRequestDto {
  @IsString()
  @Length(2, 100)
  name: string;

  @IsString()
  @Length(2, 100)
  contactPerson: string;

  @NoWhitespaces()
  @IsPhoneNumber()
  phoneNumber: string;

  @IsEmail()
  @IsLowercase()
  @MinLength(6)
  contactEmail: string;

  @IsEnum(EExtCountry, {
    message: "Country must be one of the following: " + Object.values(EExtCountry).join(", "),
  })
  country: EExtCountry;

  @IsOptional()
  @IsEnum(ECompanyActivitySphere)
  activitySphere?: ECompanyActivitySphere;

  @IsEnum(ECompanyEmployeesNumber)
  employeesNumber: ECompanyEmployeesNumber;

  @IsEnum(ECompanyType)
  companyType: ECompanyType;
}
