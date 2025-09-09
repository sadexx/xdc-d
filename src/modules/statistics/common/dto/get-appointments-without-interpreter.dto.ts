import { IsNotEmpty, IsISO8601, IsEnum } from "class-validator";
import { ELanguages } from "src/modules/interpreters/profile/common/enum";
import { CommaSeparatedToArray } from "src/common/decorators";
import { EAppointmentType } from "src/modules/statistics/common/enums";

export class GetAppointmentsWithoutInterpreterDto {
  @IsNotEmpty()
  @IsISO8601()
  dateFrom: Date;

  @IsNotEmpty()
  @IsISO8601()
  dateTo: Date;

  @IsEnum(ELanguages)
  languageFrom: ELanguages;

  @IsEnum(ELanguages)
  languageTo: ELanguages;

  @IsNotEmpty()
  @CommaSeparatedToArray()
  @IsEnum(EAppointmentType, { each: true })
  appointmentTypes: EAppointmentType[];
}
