import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import {
  EAppointmentCommunicationType,
  EAppointmentInterpreterType,
  EAppointmentInterpretingType,
  EAppointmentParticipantType,
  EAppointmentSchedulingType,
  EAppointmentSimultaneousInterpretingType,
  EAppointmentTopic,
} from "src/modules/appointments/appointment/common/enums";
import { ELanguages } from "src/modules/interpreters/profile/common/enum";
import { EUserGender } from "src/modules/users/common/enums";
import {
  CreateDraftAddressDto,
  CreateDraftExtraDayDto,
  CreateDraftMultiWayParticipantDto,
} from "src/modules/draft-appointments/common/dto";
import {
  IsCorrectMultiWayParticipant,
  IsValidCommunicationAddress,
  IsValidDraftAlternativePlatformLink,
  IsValidDraftExtraDays,
  IsValidInterpretingType,
} from "src/modules/draft-appointments/common/validators";
import {
  IsAlternativePlatformValid,
  IsExtraDaysGapValid,
  IsSameInterpreterValid,
  IsSchedulingExtraDayValid,
  IsSimultaneousTypeValid,
  IsValidServiceCombination,
  IsValidSignLanguageSelection,
} from "src/modules/appointments/shared/common/validators";
import { IsFutureDate } from "src/common/validators";
import {
  MAX_APPOINTMENT_DURATION_MINUTES,
  MIN_APPOINTMENT_DURATION_MINUTES,
} from "src/modules/appointments/appointment/common/constants";

export class CreateDraftAppointmentsDto {
  @IsUUID()
  userRoleId: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateDraftMultiWayParticipantDto)
  @IsCorrectMultiWayParticipant()
  draftParticipants?: CreateDraftMultiWayParticipantDto[];

  @IsValidCommunicationAddress()
  @ValidateNested()
  @Type(() => CreateDraftAddressDto)
  draftAddress?: CreateDraftAddressDto;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateDraftExtraDayDto)
  @IsValidDraftExtraDays()
  @IsExtraDaysGapValid()
  draftExtraDays?: CreateDraftExtraDayDto[];

  @IsDateString()
  @IsFutureDate()
  scheduledStartTime: Date;

  @IsEnum(EAppointmentCommunicationType)
  communicationType: EAppointmentCommunicationType;

  @IsEnum(EAppointmentSchedulingType)
  schedulingType: EAppointmentSchedulingType;

  @IsNotEmpty()
  @IsNumber()
  @Min(MIN_APPOINTMENT_DURATION_MINUTES, { message: "Scheduling Duration must be at least 15 minutes" })
  @Max(MAX_APPOINTMENT_DURATION_MINUTES, { message: "Scheduling Duration must be at most 480 minutes" })
  schedulingDurationMin: number;

  @IsEnum(EAppointmentTopic)
  topic: EAppointmentTopic;

  @IsOptional()
  @IsEnum(EUserGender)
  preferredInterpreterGender?: EUserGender;

  @IsEnum(EAppointmentInterpreterType)
  interpreterType: EAppointmentInterpreterType;

  @IsValidInterpretingType()
  @IsEnum(EAppointmentInterpretingType)
  @IsValidServiceCombination()
  interpretingType: EAppointmentInterpretingType;

  @IsSimultaneousTypeValid()
  simultaneousInterpretingType: EAppointmentSimultaneousInterpretingType;

  @IsEnum(ELanguages, { message: "language from is not valid" })
  @IsValidSignLanguageSelection()
  languageFrom: ELanguages;

  @IsEnum(ELanguages, { message: "language to is not valid" })
  languageTo: ELanguages;

  @IsEnum(EAppointmentParticipantType)
  participantType: EAppointmentParticipantType;

  @IsAlternativePlatformValid()
  alternativePlatform: boolean = false;

  @IsValidDraftAlternativePlatformLink()
  alternativeVideoConferencingPlatformLink: string;

  @IsOptional()
  @MaxLength(300)
  notes?: string;

  @IsBoolean()
  @IsSchedulingExtraDayValid()
  schedulingExtraDay: boolean;

  @IsBoolean()
  @IsSameInterpreterValid()
  sameInterpreter: boolean;

  @IsBoolean()
  acceptOvertimeRates: boolean;
}
