import { IsOptional, IsUUID, Length } from "class-validator";

export class SendRepeatNotificationDto {
  @IsOptional()
  @IsUUID()
  @Length(36, 36)
  interpreterRoleId?: string;
}
