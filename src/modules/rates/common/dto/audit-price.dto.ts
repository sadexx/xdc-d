import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsTimeZone,
  Length,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { IsBooleanTrue } from "src/common/validators";
import { IsValidServiceCombination } from "src/modules/appointments/shared/common/validators";
import {
  EAppointmentCommunicationType,
  EAppointmentInterpreterType,
  EAppointmentInterpretingType,
  EAppointmentSchedulingType,
  EAppointmentTopic,
} from "src/modules/appointments/appointment/common/enums";
import { ETimeCalculationMode } from "src/modules/rates/common/enums";

class AuditDiscountDto {
  @ValidateIf((obj) => (obj as AuditDiscountDto).promoCampaignDiscount !== null)
  @IsNumber()
  @Min(1)
  @Max(100)
  promoCampaignDiscount: number | null;

  @ValidateIf((obj) => (obj as AuditDiscountDto).membershipDiscount !== null)
  @IsNumber()
  @Min(1)
  @Max(100)
  membershipDiscount: number | null;

  @ValidateIf((obj) => (obj as AuditDiscountDto).promoCampaignDiscountMinutes !== null)
  @IsNumber()
  @Min(1)
  @Max(1000)
  promoCampaignDiscountMinutes: number | null;

  @ValidateIf((obj) => (obj as AuditDiscountDto).membershipFreeMinutes !== null)
  @IsNumber()
  @Min(1)
  @Max(1000)
  membershipFreeMinutes: number | null;

  @IsOptional()
  promoCode: null = null;

  @IsOptional()
  membershipType: null = null;
}

export class AuditPriceDto {
  @IsOptional()
  @IsIn([ETimeCalculationMode.NORMAL, ETimeCalculationMode.PEAK])
  timeCalculationMode?: ETimeCalculationMode;

  @IsBoolean()
  includeAuditSteps: boolean;

  @IsEnum(EAppointmentInterpreterType)
  interpreterType: EAppointmentInterpreterType;

  @IsEnum(EAppointmentSchedulingType)
  schedulingType: EAppointmentSchedulingType;

  @IsEnum(EAppointmentCommunicationType)
  communicationType: EAppointmentCommunicationType;

  @IsEnum(EAppointmentInterpretingType)
  @IsValidServiceCombination()
  interpretingType: EAppointmentInterpretingType;

  @IsEnum(EAppointmentTopic)
  topic: EAppointmentTopic;

  @IsISO8601()
  scheduledStartTime: string;

  @IsNumber()
  @Min(1)
  @Max(960, { message: "Duration must be 16 hours or less." })
  schedulingDurationMin: number;

  @IsOptional()
  @IsBoolean()
  acceptedOvertime: boolean = false;

  @IsBoolean()
  clientIsGstPayer: boolean;

  @IsBoolean()
  interpreterIsGstPayer: boolean;

  @IsOptional()
  @IsTimeZone()
  @Length(1, 50)
  clientTimezone?: string;

  @IsOptional()
  @IsTimeZone()
  @Length(1, 50)
  interpreterTimezone?: string;

  @IsOptional()
  @IsBoolean()
  @IsBooleanTrue()
  isExternalInterpreter?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => AuditDiscountDto)
  discounts?: AuditDiscountDto;
}
