import { IsOptional, IsUUID } from "class-validator";

export class GetAllRightToWorkChecksDto {
  @IsUUID()
  @IsOptional()
  userRoleId?: string;
}
