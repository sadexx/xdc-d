import { IsDateString, IsEnum, IsNotEmpty, IsNumberString, IsOptional, IsString, IsUUID } from "class-validator";
import { CommaSeparatedToArray } from "src/common/decorators";
import { PaginationQueryDto } from "src/common/dto";
import { ESortOrder } from "src/common/enums";
import {
  EAppointmentCommunicationType,
  EAppointmentInterpretingType,
  EAppointmentSchedulingType,
  EAppointmentTopic,
} from "src/modules/appointments/appointment/common/enums";
import { ELanguages } from "src/modules/interpreters/profile/common/enum";

export class GetAllDraftAppointmentsDto extends PaginationQueryDto {
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

  @IsOptional()
  @IsDateString()
  startDate?: Date;

  @IsOptional()
  @IsDateString()
  endDate?: Date;

  @IsOptional()
  @IsUUID()
  clientId?: string;

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
  clientFirstNameOrder?: ESortOrder;
}
