import { IsUUID } from "class-validator";
import { GetStatisticsByDatesDto } from "src/modules/statistics/common/dto";

export class GetSpentCostByClient extends GetStatisticsByDatesDto {
  @IsUUID()
  userRoleId: string;
}
