import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  Length,
  MinLength,
  IsLowercase,
  IsNumber,
  Min,
  Max,
} from "class-validator";
import { ECompanyActivitySphere, ECompanyEmployeesNumber, ECompanyType } from "src/modules/companies/common/enums";
import { EExtCountry } from "src/modules/addresses/common/enums";
import { MINIMUM_DEPOSIT_CHARGE_AMOUNT } from "src/modules/companies-deposit-charge/common/constants";
import { NoWhitespaces } from "src/common/decorators";
import { IsPlatformCommissionRateRequired } from "src/modules/companies/common/validators";

export class CreateCompanyDto {
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

  @IsEnum(ECompanyActivitySphere)
  activitySphere: ECompanyActivitySphere;

  @IsEnum(ECompanyEmployeesNumber)
  employeesNumber: ECompanyEmployeesNumber;

  @IsEnum(ECompanyType)
  companyType: ECompanyType;

  @IsNotEmpty()
  @IsString()
  adminName: string;

  @IsEmail()
  @IsLowercase()
  @MinLength(6)
  adminEmail: string;

  @IsUUID()
  @IsOptional()
  operatedByMainCompanyId?: string;

  @IsOptional()
  @IsNumber()
  @Min(MINIMUM_DEPOSIT_CHARGE_AMOUNT, {
    message: `Deposit Default Charge Amount must be at least ${MINIMUM_DEPOSIT_CHARGE_AMOUNT}`,
  })
  @Max(1500, { message: "Deposit Default Charge Amount must be at most 1500" })
  depositDefaultChargeAmount?: number;

  @IsOptional()
  @IsPlatformCommissionRateRequired()
  @IsNumber()
  @Min(0, { message: "Platform Commission Rate must be at least 0" })
  @Max(100, { message: "Platform Commission Rate must be at most 100" })
  platformCommissionRate?: number;
}
