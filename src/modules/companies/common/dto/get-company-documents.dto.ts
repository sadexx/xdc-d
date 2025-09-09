import { IsOptional, IsUUID } from "class-validator";

export class GetCompanyDocumentsDto {
  @IsOptional()
  @IsUUID()
  companyId?: string;
}
