import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, Max, MaxLength, Min } from "class-validator";
import { EAppointmentParticipantType, EAppointmentTopic } from "src/modules/appointments/appointment/common/enums";
import { IsValidAlternativePlatform } from "src/modules/appointments/appointment/common/validators";
import { EUserGender } from "src/modules/users/common/enums";
import { ELanguages } from "src/modules/interpreters/profile/common/enum";
import { IsFutureDate } from "src/common/validators";
import {
  MAX_APPOINTMENT_DURATION_MINUTES,
  MIN_APPOINTMENT_DURATION_MINUTES,
} from "src/modules/appointments/appointment/common/constants";

export class UpdateAppointmentDto {
  @IsOptional()
  @IsDateString()
  @IsFutureDate()
  scheduledStartTime?: Date;

  @IsOptional()
  @IsNumber()
  @Min(MIN_APPOINTMENT_DURATION_MINUTES, { message: "Scheduling Duration must be at least 15 minutes" })
  @Max(MAX_APPOINTMENT_DURATION_MINUTES, { message: "Scheduling Duration must be at most 480 minutes" })
  schedulingDurationMin?: number;

  @IsOptional()
  @IsEnum(EAppointmentTopic)
  topic?: EAppointmentTopic;

  @IsOptional()
  @IsEnum(EUserGender)
  preferredInterpreterGender?: EUserGender;

  @IsOptional()
  @IsEnum(ELanguages, { message: "Language from is not valid" })
  languageFrom?: ELanguages;

  @IsOptional()
  @IsEnum(ELanguages, { message: "Language to is not valid" })
  languageTo?: ELanguages;

  @IsOptional()
  @MaxLength(300)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  alternativePlatform?: boolean;

  @IsValidAlternativePlatform()
  alternativeVideoConferencingPlatformLink?: string;

  @IsOptional()
  @IsEnum(EAppointmentParticipantType)
  participantType?: EAppointmentParticipantType;

  @IsOptional()
  @IsBoolean()
  acceptOvertimeRates?: boolean;
}
