import { IsUUID } from "class-validator";
import { GetStatisticsByDatesDto } from "src/modules/statistics/common/dto";

export class GetHomepageBaseAppointmentStatisticByCompanyDto extends GetStatisticsByDatesDto {
  @IsUUID()
  companyId: string;
}
