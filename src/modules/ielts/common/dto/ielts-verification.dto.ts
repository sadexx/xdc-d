import { IsOptional, IsString, IsUUID } from "class-validator";

export class IeltsVerificationDto {
  @IsOptional()
  @IsUUID()
  userRoleId?: string;

  @IsString()
  trfNumber: string;
}
