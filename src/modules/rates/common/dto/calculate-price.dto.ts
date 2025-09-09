import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import {
  EAppointmentCommunicationType,
  EAppointmentInterpreterType,
  EAppointmentInterpretingType,
  EAppointmentSchedulingType,
  EAppointmentTopic,
} from "src/modules/appointments/appointment/common/enums";
import { Type } from "class-transformer";
import { IsValidServiceCombination } from "src/modules/appointments/shared/common/validators";
import { MAX_APPOINTMENT_DURATION_MINUTES } from "src/modules/appointments/appointment/common/constants";

export class CalculatePriceDto {
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

  @IsNumber()
  @Min(1)
  @Max(MAX_APPOINTMENT_DURATION_MINUTES, { message: "Duration must be 8 hours or less." })
  duration: number;

  @IsISO8601()
  scheduleDateTime: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CalculatePriceExtraDayDto)
  @ArrayMaxSize(15, { message: "You can add a maximum of 15 extra days." })
  extraDays: CalculatePriceExtraDayDto[];

  @IsOptional()
  @IsBoolean()
  acceptedOvertime: boolean;
}

export class CalculatePriceExtraDayDto {
  @IsNumber()
  @Min(1)
  @Max(MAX_APPOINTMENT_DURATION_MINUTES, { message: "Duration must be 8 hours or less." })
  duration: number;

  @IsISO8601()
  scheduleDateTime: string;
}
