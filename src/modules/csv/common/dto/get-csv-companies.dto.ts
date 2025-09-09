import { IsOptional, IsNotEmpty, IsString, IsEnum } from "class-validator";
import { CommaSeparatedToArray } from "src/common/decorators";
import { ESortOrder } from "src/common/enums";
import { EExtCountry } from "src/modules/addresses/common/enums";
import {
  ECompanyStatus,
  ECompanyActivitySphere,
  ECompanyEmployeesNumber,
  ECompanyType,
} from "src/modules/companies/common/enums";

export class GetCsvCompaniesDto {
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  searchField?: string;

  @IsOptional()
  @CommaSeparatedToArray()
  @IsEnum(ECompanyStatus, { each: true })
  statuses?: ECompanyStatus[];

  @IsOptional()
  @CommaSeparatedToArray()
  @IsEnum(ECompanyActivitySphere, { each: true })
  activitySpheres?: ECompanyActivitySphere[];

  @IsOptional()
  @CommaSeparatedToArray()
  @IsEnum(ECompanyEmployeesNumber, { each: true })
  employeesNumber?: ECompanyEmployeesNumber[];

  @IsOptional()
  @IsEnum(EExtCountry)
  country?: EExtCountry;

  @IsOptional()
  @IsEnum(ECompanyType)
  companyType?: ECompanyType;

  @IsOptional()
  @IsEnum(ESortOrder)
  sortOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  statusOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  contactPersonOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  countryOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  companyNameOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  employeesNumberOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  activitySphereOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  platformIdOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  phoneNumberOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  adminEmailOrder?: ESortOrder;
}
