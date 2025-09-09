import { IsNotEmpty, IsOptional, IsPositive, IsString, IsUUID } from "class-validator";

export class CustomInsuranceDto {
  @IsOptional()
  @IsUUID()
  userRoleId?: string;

  @IsNotEmpty()
  @IsString()
  insuredParty: string;

  @IsNotEmpty()
  @IsString()
  insuranceCompany: string;

  @IsNotEmpty()
  @IsString()
  policyNumber: string;

  @IsNotEmpty()
  @IsPositive()
  coverageLimit: number;
}
