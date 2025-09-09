import { IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

export class UpdateConcessionCardDto {
  @IsNotEmpty()
  @IsUUID()
  id: string;

  @IsOptional()
  @IsString()
  centerlinkPensionerConcessionCardNumber?: string;

  @IsOptional()
  @IsString()
  veteranAffairsPensionerConcessionCardNumber?: string;
}
