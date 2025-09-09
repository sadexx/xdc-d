import { ESortOrder } from "src/common/enums";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";
import {
  EAppointmentCommunicationType,
  EAppointmentInterpretingType,
  EAppointmentSchedulingType,
  EAppointmentStatus,
  EAppointmentTopic,
} from "src/modules/appointments/appointment/common/enums";
import { ELanguages } from "src/modules/interpreters/profile/common/enum";
import { CommaSeparatedToArray } from "src/common/decorators";
import { Transform } from "class-transformer";
import { IsWithinOneMonth } from "src/modules/csv/common/validators";

export class GetCsvAppointmentsDto {
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  searchField?: string;

  @IsOptional()
  @CommaSeparatedToArray()
  @IsEnum(EAppointmentStatus, { each: true })
  statuses?: EAppointmentStatus[];

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
  clientId?: string;

  @IsOptional()
  @IsUUID()
  interpreterId?: string;

  @IsOptional()
  @IsUUID()
  operatedByCompanyId?: string;

  @IsOptional()
  @IsUUID()
  clientOperatedByCompanyId?: string;

  @IsOptional()
  @IsUUID()
  interpreterOperatedByCompanyId?: string;

  @IsNotEmpty()
  @IsDateString()
  startDate: Date;

  @IsNotEmpty()
  @IsDateString()
  @IsWithinOneMonth()
  endDate: Date;

  @IsOptional()
  @Transform(({ value }) => value === "true")
  @IsBoolean()
  isRedFlagOnly?: boolean;

  @IsOptional()
  @IsEnum(ESortOrder)
  sortOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  statusOrder?: ESortOrder;

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

  @IsOptional()
  @IsEnum(ESortOrder)
  interpreterFirstNameOrder?: ESortOrder;
}
