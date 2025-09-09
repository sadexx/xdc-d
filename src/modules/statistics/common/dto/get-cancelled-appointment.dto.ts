import { IsIn, IsNotEmpty } from "class-validator";
import { ROLES_WHICH_CAN_CANCEL_APPOINTMENT } from "src/common/constants";
import { CommaSeparatedToArray } from "src/common/decorators";
import { GetAppointmentsByTypeDto } from "src/modules/statistics/common/dto";

export class GetCancelledAppointmentDto extends GetAppointmentsByTypeDto {
  @IsNotEmpty()
  @CommaSeparatedToArray()
  @IsIn(["all", ...ROLES_WHICH_CAN_CANCEL_APPOINTMENT], { each: true })
  roleNames: string[];
}
