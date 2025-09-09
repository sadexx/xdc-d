import { IsUUID } from "class-validator";
import { GetAppointmentsByTypeDto } from "src/modules/statistics/common/dto";

export class GetCancelledAppointmentsByCompanyAndUserDto extends GetAppointmentsByTypeDto {
  @IsUUID()
  userRoleId: string;

  @IsUUID()
  companyId: string;
}
