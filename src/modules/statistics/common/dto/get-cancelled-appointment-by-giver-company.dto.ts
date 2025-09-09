import { IsUUID } from "class-validator";
import { GetAppointmentsByTypeDto } from "src/modules/statistics/common/dto";

export class GetCancelledAppointmentByInterpreterCompanyDto extends GetAppointmentsByTypeDto {
  @IsUUID()
  companyId: string;
}
