import { IsNotEmpty, IsEnum } from "class-validator";
import { GetStatisticsByDatesDto } from "src/modules/statistics/common/dto";
import { CommaSeparatedToArray } from "src/common/decorators";
import { EAppointmentType } from "src/modules/statistics/common/enums";

export class GetAppointmentsByTypeDto extends GetStatisticsByDatesDto {
  @IsNotEmpty()
  @CommaSeparatedToArray()
  @IsEnum(EAppointmentType, { each: true })
  appointmentTypes: EAppointmentType[];
}
