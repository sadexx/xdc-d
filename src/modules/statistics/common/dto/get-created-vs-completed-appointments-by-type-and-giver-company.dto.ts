import { IsEnum } from "class-validator";
import { GetCreatedVsCompletedAppointmentsByTypeAndCompanyDto } from "src/modules/statistics/common/dto";
import { ECorporateInterpreterSubordinatesTypes } from "src/modules/statistics/common/enums";

export class GetCreatedVsCompletedAppointmentsByTypeAndInterpreterCompanyDto extends GetCreatedVsCompletedAppointmentsByTypeAndCompanyDto {
  @IsEnum(ECorporateInterpreterSubordinatesTypes)
  corporateInterpreterSubordinatesType: ECorporateInterpreterSubordinatesTypes;
}
