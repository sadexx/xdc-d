import { IsUUID } from "class-validator";
import { GetAppointmentsByLanguageDto } from "src/modules/statistics/common/dto";

export class GetAppointmentsByLanguageAndCompanyDto extends GetAppointmentsByLanguageDto {
  @IsUUID()
  companyId: string;
}
