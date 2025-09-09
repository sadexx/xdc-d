import { IsIn, IsNotEmpty } from "class-validator";
import { APPOINTMENT_INTERPRETING_CRITERIA } from "src/modules/statistics/common/constants/constants";
import { CommaSeparatedToArray } from "src/common/decorators";
import { GetStatisticsByDatesDto } from "src/modules/statistics/common/dto";

export class GetAppointmentsByInterpretingTypeDto extends GetStatisticsByDatesDto {
  @IsNotEmpty()
  @CommaSeparatedToArray()
  @IsIn(Object.keys(APPOINTMENT_INTERPRETING_CRITERIA), { each: true })
  interpretingTypes: Array<keyof typeof APPOINTMENT_INTERPRETING_CRITERIA>;
}
