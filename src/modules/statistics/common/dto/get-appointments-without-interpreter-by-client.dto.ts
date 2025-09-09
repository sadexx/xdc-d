import { IsUUID } from "class-validator";
import { GetAppointmentsWithoutInterpreterDto } from "src/modules/statistics/common/dto";

export class GetAppointmentsWithoutInterpreterByClientDto extends GetAppointmentsWithoutInterpreterDto {
  @IsUUID()
  userRoleId: string;
}
