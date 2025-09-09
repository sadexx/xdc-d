import { IsUUID } from "class-validator";

export class CompanyIdDto {
  @IsUUID()
  companyId: string;
}
