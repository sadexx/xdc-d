import { IsArray, IsEnum, IsNumber, IsString, IsUUID, Max, Min, ValidateIf, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import {
  EAppointmentCommunicationType,
  EAppointmentInterpreterType,
  EAppointmentInterpretingType,
  EAppointmentSchedulingType,
} from "src/modules/appointments/appointment/common/enums";
import { ERateDetailsSequence, ERateQualifier } from "src/modules/rates/common/enums";
import { TRateTiming, TimeString } from "src/modules/rates/common/types";
import { IsValidRateDetails, IsValidTimeFormat } from "src/modules/rates/common/validators";
import { MAX_APPOINTMENT_DURATION_MINUTES } from "src/modules/appointments/appointment/common/constants";
import { MIN_RATE_BLOCK_DURATION_MINUTES } from "src/modules/rates/common/constants";

export class UpdateRateDto {
  @IsUUID()
  id: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsEnum(EAppointmentInterpreterType)
  interpreterType: EAppointmentInterpreterType;

  @IsEnum(EAppointmentSchedulingType)
  schedulingType: EAppointmentSchedulingType;

  @IsEnum(EAppointmentCommunicationType)
  communicationType: EAppointmentCommunicationType;

  @IsEnum(EAppointmentInterpretingType)
  interpretingType: EAppointmentInterpretingType;

  @IsEnum(ERateQualifier)
  qualifier: ERateQualifier;

  @IsValidRateDetails()
  details: TRateTiming;

  @IsEnum(ERateDetailsSequence)
  detailsSequence: ERateDetailsSequence;

  @Min(MIN_RATE_BLOCK_DURATION_MINUTES)
  @Max(MAX_APPOINTMENT_DURATION_MINUTES)
  detailsTime: number;

  @IsString()
  @IsValidTimeFormat()
  normalHoursStart: TimeString;

  @IsString()
  normalHoursEnd: TimeString;

  @IsNumber()
  @Min(0)
  paidByTakerGeneralWithGst: number;

  @IsNumber()
  @Min(0)
  paidByTakerGeneralWithoutGst: number;

  @ValidateIf((obj) => (obj as Partial<UpdateRateDto>).paidByTakerSpecialWithGst !== null)
  @IsNumber()
  @Min(0)
  paidByTakerSpecialWithGst: number | null;

  @ValidateIf((obj) => (obj as Partial<UpdateRateDto>).paidByTakerSpecialWithoutGst !== null)
  @IsNumber()
  @Min(0)
  paidByTakerSpecialWithoutGst: number | null;

  @IsNumber()
  @Min(0)
  lfhCommissionGeneral: number;

  @ValidateIf((obj) => (obj as Partial<UpdateRateDto>).lfhCommissionSpecial !== null)
  @IsNumber()
  @Min(0)
  lfhCommissionSpecial: number | null;

  @IsNumber()
  @Min(0)
  paidToInterpreterGeneralWithGst: number;

  @IsNumber()
  @Min(0)
  paidToInterpreterGeneralWithoutGst: number;

  @ValidateIf((obj) => (obj as Partial<UpdateRateDto>).paidToInterpreterSpecialWithGst !== null)
  @IsNumber()
  @Min(0)
  paidToInterpreterSpecialWithGst: number | null;

  @ValidateIf((obj) => (obj as Partial<UpdateRateDto>).paidToInterpreterSpecialWithoutGst !== null)
  @IsNumber()
  @Min(0)
  paidToInterpreterSpecialWithoutGst: number | null;
}

export class UpdateRateTableDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateRateDto)
  data: UpdateRateDto[];
}
