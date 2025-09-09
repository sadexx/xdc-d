import { IsEnum, IsOptional } from "class-validator";
import { ELanguages } from "src/modules/interpreters/profile/common/enum";
import { GetStatisticsByDatesDto } from "src/modules/statistics/common/dto";
import {
  EAppointmentCommunicationType,
  EAppointmentSchedulingType,
} from "src/modules/appointments/appointment/common/enums";
import { CommaSeparatedToArray } from "src/common/decorators";

export class GetRejectedVsAcceptedAppointmentsGeneralDto extends GetStatisticsByDatesDto {
  @IsOptional()
  @IsEnum(ELanguages)
  languageFrom?: ELanguages;

  @IsOptional()
  @IsEnum(ELanguages)
  languageTo?: ELanguages;

  @IsOptional()
  @CommaSeparatedToArray()
  @IsEnum(EAppointmentSchedulingType, { each: true })
  schedulingTypes?: EAppointmentSchedulingType[];

  @IsOptional()
  @CommaSeparatedToArray()
  @IsEnum(EAppointmentCommunicationType, { each: true })
  communicationTypes?: EAppointmentCommunicationType[];
}
