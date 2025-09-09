import { IsEnum } from "class-validator";
import { ELanguages } from "src/modules/interpreters/profile/common/enum";
import { GetStatisticsByDatesDto } from "src/modules/statistics/common/dto";

export class GetAppointmentsByLanguageDto extends GetStatisticsByDatesDto {
  @IsEnum(ELanguages)
  languageFrom: ELanguages;

  @IsEnum(ELanguages)
  languageTo: ELanguages;
}
