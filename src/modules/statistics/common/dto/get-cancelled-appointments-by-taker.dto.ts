import { IsUUID } from "class-validator";
import { GetAppointmentsByTypeDto } from "src/modules/statistics/common/dto";

export class GetCancelledAppointmentsByClientDto extends GetAppointmentsByTypeDto {
  @IsUUID()
  userRoleId: string;
}
