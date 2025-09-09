import { IsUUID } from "class-validator";
import { GetAppointmentsByInterpretingTypeDto } from "src/modules/statistics/common/dto";

export class GetAppointmentsByInterpretingTypeAndCompanyDto extends GetAppointmentsByInterpretingTypeDto {
  @IsUUID()
  companyId: string;
}
