import { IsEnum } from "class-validator";
import { EInterpreterAppointmentCriteria } from "src/modules/statistics/common/enums";
import { GetAdminStatisticsDto } from "src/modules/statistics/common/dto";

export class GetAdminInterpreterStatisticsDto extends GetAdminStatisticsDto {
  @IsEnum(EInterpreterAppointmentCriteria)
  activeCriteria: EInterpreterAppointmentCriteria;
}
