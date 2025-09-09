import { IsUUID, Length } from "class-validator";

export class AppointmentIdParamDto {
  @IsUUID()
  @Length(36, 36)
  appointmentId: string;
}
