import { IsUUID } from "class-validator";
import { GetAppointmentsByInterpretingTypeAndCompanyDto } from "src/modules/statistics/common/dto";

export class GetAppointmentsByInterpretingTypeAndCompanyAndUserDto extends GetAppointmentsByInterpretingTypeAndCompanyDto {
  @IsUUID()
  userRoleId: string;
}
