import { IsUUID } from "class-validator";
import { GetStatisticsByDatesDto } from "src/modules/statistics/common/dto";

export class GetSpentCostByCompany extends GetStatisticsByDatesDto {
  @IsUUID()
  companyId: string;
}
