import { IsUUID } from "class-validator";
import { GetAppointmentsByLanguageDto } from "src/modules/statistics/common/dto";

export class GetRejectedVsAcceptedAppointmentsDto extends GetAppointmentsByLanguageDto {
  @IsUUID()
  userRoleId: string;
}
