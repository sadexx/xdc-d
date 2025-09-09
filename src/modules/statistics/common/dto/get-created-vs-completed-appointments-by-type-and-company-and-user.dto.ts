import { IsUUID } from "class-validator";
import { GetCreatedVsCompletedAppointmentsByTypeAndCompanyDto } from "src/modules/statistics/common/dto";

export class GetCreatedVsCompletedAppointmentsByTypeAndCompanyAndUserDto extends GetCreatedVsCompletedAppointmentsByTypeAndCompanyDto {
  @IsUUID()
  userRoleId: string;
}
