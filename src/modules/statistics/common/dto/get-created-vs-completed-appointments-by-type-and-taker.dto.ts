import { IsUUID } from "class-validator";
import { GetAppointmentsByTypeDto } from "src/modules/statistics/common/dto";

export class GetCreatedVsCompletedAppointmentsByTypeAndClientDto extends GetAppointmentsByTypeDto {
  @IsUUID()
  userRoleId: string;
}
