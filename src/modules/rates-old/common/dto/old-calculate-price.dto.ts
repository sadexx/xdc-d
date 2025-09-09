import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsTimeZone,
  Length,
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

export class OldCalculatePriceDto {
  @IsEnum(EAppointmentInterpreterType)
  interpreterType: EAppointmentInterpreterType;

  @IsEnum(EAppointmentSchedulingType)
  schedulingType: EAppointmentSchedulingType;

  @IsEnum(EAppointmentCommunicationType)
  communicationType: EAppointmentCommunicationType;

  @IsEnum(EAppointmentInterpretingType)
  interpretingType: EAppointmentInterpretingType;

  @IsEnum(EAppointmentTopic)
  topic: EAppointmentTopic;

  @IsNumber()
  @Min(1)
  @Max(480, { message: "Duration must be 8 hours or less." })
  duration: number;

  @IsISO8601()
  scheduleDateTime: string;

  @IsOptional()
  @IsTimeZone()
  @Length(1, 50)
  interpreterTimezone?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OldCalculatePriceExtraDayDto)
  @ArrayMaxSize(15, { message: "You can add a maximum of 15 extra days." })
  extraDays: OldCalculatePriceExtraDayDto[];

  @IsOptional()
  @IsBoolean()
  acceptedOvertime?: boolean;
}

export class OldCalculatePriceExtraDayDto {
  @IsNumber()
  @Min(1)
  @Max(480, { message: "Duration must be 8 hours or less." })
  duration: number;

  @IsISO8601()
  scheduleDateTime: string;
}
