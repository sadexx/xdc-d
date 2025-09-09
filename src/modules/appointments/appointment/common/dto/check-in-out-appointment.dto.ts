import { IsOptional, IsString, IsDateString, IsEnum, IsBase64 } from "class-validator";
import { EAppointmentExternalSessionType } from "src/modules/appointments/appointment/common/enums";
import { IsValidCheckInOutData } from "src/modules/appointments/appointment/common/validators";

export class CheckInOutAppointmentDto {
  @IsEnum(EAppointmentExternalSessionType)
  @IsValidCheckInOutData()
  type: EAppointmentExternalSessionType;

  @IsOptional()
  @IsString()
  verifyingPersonName?: string;

  @IsOptional()
  @IsBase64()
  verifyingPersonSignature?: string;

  @IsOptional()
  @IsDateString()
  alternativeTime?: Date;
}
