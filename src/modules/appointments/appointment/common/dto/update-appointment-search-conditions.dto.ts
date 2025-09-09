import { IsEnum, IsOptional } from "class-validator";
import { EAppointmentTopic } from "src/modules/appointments/appointment/common/enums";
import { EUserGender } from "src/modules/users/common/enums";

export class UpdateAppointmentSearchConditionsDto {
  @IsOptional()
  @IsEnum(EAppointmentTopic)
  topic?: EAppointmentTopic;

  @IsOptional()
  @IsEnum(EUserGender)
  preferredInterpreterGender?: EUserGender | null;
}
