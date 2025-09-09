import { IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

export class NaatiCpnQueryDto {
  @IsOptional()
  @IsUUID()
  userRoleId?: string;

  @IsString()
  @IsNotEmpty()
  cpn: string;
}
