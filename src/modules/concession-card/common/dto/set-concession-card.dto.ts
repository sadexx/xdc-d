import { IsOptional, IsString, IsUUID } from "class-validator";

export class SetConcessionCardDto {
  @IsOptional()
  @IsUUID()
  userRoleId?: string;

  @IsOptional()
  @IsString()
  centerlinkPensionerConcessionCardNumber?: string;

  @IsOptional()
  @IsString()
  veteranAffairsPensionerConcessionCardNumber?: string;
}
