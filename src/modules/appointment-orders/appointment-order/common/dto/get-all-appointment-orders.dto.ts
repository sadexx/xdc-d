import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from "class-validator";
import { ESortOrder } from "src/common/enums";
import { CommaSeparatedToArray } from "src/common/decorators";
import {
  EAppointmentCommunicationType,
  EAppointmentInterpretingType,
  EAppointmentSchedulingType,
  EAppointmentTopic,
} from "src/modules/appointments/appointment/common/enums";
import { ELanguages } from "src/modules/interpreters/profile/common/enum";

export class GetAllAppointmentOrdersDto {
  @IsOptional()
  @IsUUID()
  @Length(36, 36)
  interpreterRoleId?: string;

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
  schedulingDurationMin: number;

  @IsOptional()
  @IsDateString()
  startDate?: Date;

  @IsOptional()
  @IsDateString()
  endDate?: Date;

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
  clientFirstNameOrder?: ESortOrder;
}
