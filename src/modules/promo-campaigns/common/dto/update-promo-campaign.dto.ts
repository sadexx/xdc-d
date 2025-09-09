import {
  IsNotEmpty,
  IsString,
  IsUppercase,
  Length,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsDateString,
  IsIn,
  IsEnum,
  IsArray,
  ArrayNotEmpty,
  IsBoolean,
  IsUUID,
  ValidateIf,
  MaxLength,
} from "class-validator";
import {
  EAppointmentCommunicationType,
  EAppointmentSchedulingType,
  EAppointmentInterpreterType,
  EAppointmentInterpretingType,
  EAppointmentTopic,
} from "src/modules/appointments/appointment/common/enums";
import {
  EPromoCampaignTarget,
  EPromoCampaignApplication,
  EPromoCampaignStatus,
} from "src/modules/promo-campaigns/common/enums";
import {
  IsAtLeast24HoursLater,
  IsValidPromoCampaignServiceCombinations,
} from "src/modules/promo-campaigns/common/validators";
import {
  TCreatePromoCampaignInterpretingType,
  TPersonalPromoCampaignDtoTarget,
  TUpdatePromoCampaignDtoStatus,
} from "src/modules/promo-campaigns/common/types";

export class UpdatePromoCampaignDto {
  @IsOptional()
  @IsUUID()
  bannerId?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @IsUppercase()
  @Length(10, 10)
  promoCode?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  discount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  discountMinutes?: number | null;

  @IsOptional()
  @IsDateString()
  @IsAtLeast24HoursLater()
  startDate?: Date;

  @IsOptional()
  @ValidateIf((obj) => (obj as Partial<UpdatePromoCampaignDto>).endDate !== null)
  @IsDateString()
  endDate?: Date | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  usageLimit?: number | null;

  @IsOptional()
  @IsString()
  partnerName?: string;

  @IsOptional()
  @IsIn([EPromoCampaignStatus.TERMINATED, EPromoCampaignStatus.ON_GOING])
  status?: TUpdatePromoCampaignDtoStatus;

  @IsOptional()
  @IsIn([EPromoCampaignTarget.GENERAL, EPromoCampaignTarget.PERSONAL, EPromoCampaignTarget.ALL_NEW_PERSONAL])
  target?: TPersonalPromoCampaignDtoTarget;

  @IsOptional()
  @IsEnum(EPromoCampaignApplication)
  application?: EPromoCampaignApplication;

  @IsOptional()
  @IsBoolean()
  @IsValidPromoCampaignServiceCombinations()
  allServices?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(EAppointmentCommunicationType, { each: true })
  communicationTypes?: EAppointmentCommunicationType[];

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(EAppointmentSchedulingType, { each: true })
  schedulingTypes?: EAppointmentSchedulingType[];

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(EAppointmentTopic, { each: true })
  topics?: EAppointmentTopic[];

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(EAppointmentInterpreterType, { each: true })
  interpreterTypes?: EAppointmentInterpreterType[];

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsIn([EAppointmentInterpretingType.CONSECUTIVE], { each: true })
  interpretingTypes?: TCreatePromoCampaignInterpretingType[];

  @IsOptional()
  @IsBoolean()
  bannerDisplay?: boolean;

  @IsOptional()
  @IsNotEmpty()
  @MaxLength(512)
  conditionsUrl?: string | null;
}
