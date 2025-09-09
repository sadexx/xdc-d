import { IsOptional, IsUUID } from "class-validator";

export class CompanyIdOptionalDto {
  @IsOptional()
  @IsUUID()
  companyId?: string;
}
