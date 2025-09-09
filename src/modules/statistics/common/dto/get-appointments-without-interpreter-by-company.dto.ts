import { IsUUID } from "class-validator";
import { GetAppointmentsWithoutInterpreterDto } from "src/modules/statistics/common/dto";

export class GetAppointmentsWithoutInterpreterByCompanyDto extends GetAppointmentsWithoutInterpreterDto {
  @IsUUID()
  companyId: string;
}
