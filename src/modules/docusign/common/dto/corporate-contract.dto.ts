import { IsString, IsUUID } from "class-validator";

export class CorporateContractDto {
  @IsUUID()
  @IsString()
  companyId: string;
}
