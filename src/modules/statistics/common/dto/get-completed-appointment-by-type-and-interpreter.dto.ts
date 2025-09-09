import { IsUUID } from "class-validator";
import { GetAppointmentsByTypeDto } from "src/modules/statistics/common/dto";

export class GetCompletedAppointmentByTypeAndInterpreterDto extends GetAppointmentsByTypeDto {
  @IsUUID()
  userRoleId: string;
}
