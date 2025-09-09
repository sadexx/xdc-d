import { IsUUID } from "class-validator";
import { GetAppointmentsByLanguageAndCompanyDto } from "src/modules/statistics/common/dto";

export class GetAppointmentsByLanguageAndCompanyAndUserDto extends GetAppointmentsByLanguageAndCompanyDto {
  @IsUUID()
  userRoleId: string;
}
