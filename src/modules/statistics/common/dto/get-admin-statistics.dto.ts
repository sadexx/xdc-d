import { IsIn, IsNotEmpty } from "class-validator";
import { ADMIN_STATISTICS_ALLOWED_ROLES } from "src/common/constants";
import { CommaSeparatedToArray } from "src/common/decorators";
import { GetStatisticsByDatesDto } from "src/modules/statistics/common/dto";

export class GetAdminStatisticsDto extends GetStatisticsByDatesDto {
  @IsNotEmpty()
  @CommaSeparatedToArray()
  @IsIn(["all", ...ADMIN_STATISTICS_ALLOWED_ROLES], { each: true })
  roleNames: string[];
}
