import {
  IsLowercase,
  MinLength,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  Length,
  IsNumber,
  Min,
  Max,
} from "class-validator";
import {
  ECompanyActivitySphere,
  ECompanyEmployeesNumber,
  ECompanyFundingSource,
} from "src/modules/companies/common/enums";
import { MINIMUM_DEPOSIT_CHARGE_AMOUNT } from "src/modules/companies-deposit-charge/common/constants";
import { NoWhitespaces } from "src/common/decorators";

export class UpdateCompanyProfileInformationDto {
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
  @IsNumber()
  @Min(MINIMUM_DEPOSIT_CHARGE_AMOUNT, {
    message: `Deposit Default Charge Amount must be at least ${MINIMUM_DEPOSIT_CHARGE_AMOUNT}`,
  })
  @Max(1500, { message: "Deposit Default Charge Amount must be at most 1500" })
  depositDefaultChargeAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: "Platform Commission Rate must be at least 0" })
  @Max(100, { message: "Platform Commission Rate must be at most 100" })
  platformCommissionRate?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  businessRegistrationNumber?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  abnNumber?: string;

  @IsOptional()
  @IsEnum(ECompanyFundingSource)
  fundingSource?: ECompanyFundingSource;
}
