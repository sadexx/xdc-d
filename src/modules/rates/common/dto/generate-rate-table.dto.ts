import { IsEnum, IsNumber, IsOptional } from "class-validator";
import { EAppointmentInterpreterType } from "src/modules/appointments/appointment/common/enums";

export class GenerateRateTableDto {
  @IsEnum(EAppointmentInterpreterType)
  interpreterType: EAppointmentInterpreterType;

  @IsOptional()
  @IsNumber()
  onDemandAudioStandardFirst?: number;
}
