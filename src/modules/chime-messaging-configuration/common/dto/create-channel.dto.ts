import { IsNumberString, IsOptional, IsString, IsUUID, Length } from "class-validator";

export class CreateChannelDto {
  @IsOptional()
  @IsUUID()
  recipientId?: string;

  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @IsOptional()
  @IsString()
  @Length(6, 6, { message: "appointmentGroupId must be exactly 6 characters long" })
  @IsNumberString()
  appointmentsGroupId?: string;
}
