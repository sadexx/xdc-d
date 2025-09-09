import { IsOptional, IsNotEmpty, IsString, IsEnum, IsNumberString, IsUUID, IsDateString } from "class-validator";
import { CommaSeparatedToArray } from "src/common/decorators";
import { ESortOrder } from "src/common/enums";
import {
  EAppointmentSchedulingType,
  EAppointmentInterpretingType,
  EAppointmentTopic,
  EAppointmentCommunicationType,
} from "src/modules/appointments/appointment/common/enums";
import { ELanguages } from "src/modules/interpreters/profile/common/enum";
import { IsWithinOneMonth } from "src/modules/csv/common/validators";

export class GetCsvDraftAppointmentsDto {
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  searchField?: string;

  @IsOptional()
  @CommaSeparatedToArray()
  @IsEnum(EAppointmentSchedulingType, { each: true })
  schedulingTypes?: EAppointmentSchedulingType[];

  @IsOptional()
  @CommaSeparatedToArray()
  @IsEnum(EAppointmentInterpretingType, { each: true })
  interpretingTypes?: EAppointmentInterpretingType[];

  @IsOptional()
  @CommaSeparatedToArray()
  @IsEnum(EAppointmentTopic, { each: true })
  topics?: EAppointmentTopic[];

  @IsOptional()
  @CommaSeparatedToArray()
  @IsEnum(EAppointmentCommunicationType, { each: true })
  communicationTypes?: EAppointmentCommunicationType[];

  @IsOptional()
  @IsEnum(ELanguages)
  languageFrom?: ELanguages;

  @IsOptional()
  @IsEnum(ELanguages)
  languageTo?: ELanguages;

  @IsOptional()
  @IsNumberString()
  schedulingDurationMin?: number;

  @IsOptional()
  @IsUUID()
  operatedByCompanyId?: string;

  @IsOptional()
  @IsUUID()
  clientOperatedByCompanyId?: string;

  @IsNotEmpty()
  @IsDateString()
  startDate: Date;

  @IsNotEmpty()
  @IsDateString()
  @IsWithinOneMonth()
  endDate: Date;

  @IsOptional()
  @IsEnum(ESortOrder)
  sortOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  schedulingTypeOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  topicOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  languageOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  platformIdOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  scheduledStartTimeOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  schedulingDurationMinOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  operatedByCompanyNameOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  clientFirstNameOrder?: ESortOrder;
}
