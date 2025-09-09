import { IsOptional, IsUUID } from "class-validator";

export class GetCompanyStatusDto {
  @IsOptional()
  @IsUUID()
  companyId?: string;
}
