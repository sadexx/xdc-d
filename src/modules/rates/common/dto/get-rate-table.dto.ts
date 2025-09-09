import { IsEnum } from "class-validator";
import { EAppointmentInterpreterType } from "src/modules/appointments/appointment/common/enums";

export class GetRateTableDto {
  @IsEnum(EAppointmentInterpreterType)
  interpreterType: EAppointmentInterpreterType;
}
