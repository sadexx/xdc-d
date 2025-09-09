import { IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

export class UploadDocDto {
  @IsUUID()
  @IsOptional()
  companyId?: string;

  @IsString()
  @IsNotEmpty()
  type: string;
}
