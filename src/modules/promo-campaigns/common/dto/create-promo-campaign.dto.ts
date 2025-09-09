import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUppercase,
  Length,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import {
  EAppointmentCommunicationType,
  EAppointmentSchedulingType,
  EAppointmentTopic,
  EAppointmentInterpreterType,
  EAppointmentInterpretingType,
} from "src/modules/appointments/appointment/common/enums";
import { EPromoCampaignApplication } from "src/modules/promo-campaigns/common/enums";
import {
  IsAtLeast24HoursLater,
  IsValidPromoCampaignServiceCombinations,
} from "src/modules/promo-campaigns/common/validators";
import { TCreatePromoCampaignInterpretingType } from "src/modules/promo-campaigns/common/types";

export class CreatePromoCampaignDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  @IsUppercase()
  @Length(10, 10)
  promoCode: string;

  @IsInt()
  @Min(1)
  @Max(100)
  discount: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  discountMinutes?: number;

  @IsDateString()
  @IsAtLeast24HoursLater()
  startDate: Date;

  @IsOptional()
  @IsDateString()
  endDate?: Date;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  usageLimit?: number;

  @IsEnum(EPromoCampaignApplication)
  application: EPromoCampaignApplication;

  @IsNotEmpty()
  @IsBoolean()
  @IsValidPromoCampaignServiceCombinations()
  allServices: boolean;

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(EAppointmentCommunicationType, { each: true })
  communicationTypes: EAppointmentCommunicationType[];

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(EAppointmentSchedulingType, { each: true })
  schedulingTypes: EAppointmentSchedulingType[];

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(EAppointmentTopic, { each: true })
  topics: EAppointmentTopic[];

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(EAppointmentInterpreterType, { each: true })
  interpreterTypes: EAppointmentInterpreterType[];

  @IsArray()
  @ArrayNotEmpty()
  @IsIn([EAppointmentInterpretingType.CONSECUTIVE], { each: true })
  interpretingTypes: TCreatePromoCampaignInterpretingType[];

  @IsBoolean()
  bannerDisplay: boolean;

  @IsOptional()
  @IsNotEmpty()
  @MaxLength(512)
  conditionsUrl?: string;
}
