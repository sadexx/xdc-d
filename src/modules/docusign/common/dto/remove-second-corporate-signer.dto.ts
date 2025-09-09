import { IsOptional, IsString, IsUUID } from "class-validator";

export class RemoveSecondCorporateSignerDto {
  @IsOptional()
  @IsUUID()
  @IsString()
  companyId?: string;
}
