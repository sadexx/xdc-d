import { IsUUID } from "class-validator";
import { GetAppointmentsByInterpretingTypeDto } from "src/modules/statistics/common/dto";

export class GetAppointmentsByInterpretingTypeAndClientDto extends GetAppointmentsByInterpretingTypeDto {
  @IsUUID()
  userRoleId: string;
}
