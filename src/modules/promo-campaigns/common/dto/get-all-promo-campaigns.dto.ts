import { IsOptional, IsNotEmpty, IsString, IsEnum, IsDateString } from "class-validator";
import { CommaSeparatedToArray } from "src/common/decorators";
import {
  EPromoCampaignApplication,
  EPromoCampaignDuration,
  EPromoCampaignStatus,
  EPromoCampaignTarget,
} from "src/modules/promo-campaigns/common/enums";
import {
  EAppointmentCommunicationType,
  EAppointmentInterpreterType,
  EAppointmentInterpretingType,
  EAppointmentSchedulingType,
  EAppointmentTopic,
} from "src/modules/appointments/appointment/common/enums";
import { PaginationQueryDto } from "src/common/dto";
import { ESortOrder } from "src/common/enums";

export class GetAllPromoCampaignsDto extends PaginationQueryDto {
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  searchField?: string;

  @IsOptional()
  @CommaSeparatedToArray()
  @IsEnum(EPromoCampaignStatus, { each: true })
  statuses?: EPromoCampaignStatus[];

  @IsOptional()
  @CommaSeparatedToArray()
  @IsEnum(EPromoCampaignTarget, { each: true })
  targets?: EPromoCampaignTarget[];

  @IsOptional()
  @CommaSeparatedToArray()
  @IsEnum(EPromoCampaignDuration, { each: true })
  durations?: EPromoCampaignDuration[];

  @IsOptional()
  @CommaSeparatedToArray()
  @IsEnum(EPromoCampaignApplication, { each: true })
  applications?: EPromoCampaignApplication[];

  @IsOptional()
  @CommaSeparatedToArray()
  @IsEnum(EAppointmentCommunicationType, { each: true })
  communicationTypes?: EAppointmentCommunicationType[];

  @IsOptional()
  @CommaSeparatedToArray()
  @IsEnum(EAppointmentSchedulingType, { each: true })
  schedulingTypes?: EAppointmentSchedulingType[];

  @IsOptional()
  @CommaSeparatedToArray()
  @IsEnum(EAppointmentTopic, { each: true })
  topics?: EAppointmentTopic[];

  @IsOptional()
  @CommaSeparatedToArray()
  @IsEnum(EAppointmentInterpreterType, { each: true })
  interpreterTypes?: EAppointmentInterpreterType[];

  @IsOptional()
  @CommaSeparatedToArray()
  @IsEnum(EAppointmentInterpretingType, { each: true })
  interpretingTypes?: EAppointmentInterpretingType[];

  @IsOptional()
  @IsDateString()
  startDate?: Date;

  @IsOptional()
  @IsDateString()
  endDate?: Date;

  @IsOptional()
  @IsEnum(ESortOrder)
  statusOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  targetOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  durationOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  applicationOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  nameOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  promoCodeOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  discountOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  discountMinutesOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  usageLimitOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  totalTimesUsedOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  partnerNameOrder?: ESortOrder;
}
