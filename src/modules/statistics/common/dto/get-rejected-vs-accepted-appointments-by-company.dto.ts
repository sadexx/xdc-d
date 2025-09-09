import { IsUUID } from "class-validator";
import { GetRejectedVsAcceptedAppointmentsDto } from "src/modules/statistics/common/dto";

export class GetRejectedVsAcceptedAppointmentsByCompanyDto extends GetRejectedVsAcceptedAppointmentsDto {
  @IsUUID()
  companyId: string;
}
