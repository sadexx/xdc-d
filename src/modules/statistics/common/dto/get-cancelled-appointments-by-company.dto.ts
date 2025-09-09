import { IsUUID } from "class-validator";
import { GetCancelledAppointmentDto } from "src/modules/statistics/common/dto";

export class GetCancelledAppointmentsByCompanyDto extends GetCancelledAppointmentDto {
  @IsUUID()
  companyId: string;
}
