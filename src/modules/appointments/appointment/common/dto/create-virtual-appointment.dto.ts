import { Type } from "class-transformer";
import { IsBoolean, IsIn, ValidateNested } from "class-validator";
import {
  EAppointmentCommunicationType,
  EAppointmentInterpretingType,
} from "src/modules/appointments/appointment/common/enums";
import { CreateAppointmentDto, CreateExtraDayVirtualDto } from "src/modules/appointments/appointment/common/dto";
import {
  IsValidAlternativePlatform,
  IsValidScheduledStartTimeVirtual,
  IsValidSchedulingExtraDays,
} from "src/modules/appointments/appointment/common/validators";
import {
  IsAlternativePlatformValid,
  IsExtraDaysGapValid,
  IsValidServiceCombination,
} from "src/modules/appointments/shared/common/validators";
import { AUDIO_VIDEO_COMMUNICATION_TYPES } from "src/modules/appointments/shared/common/constants";

export class CreateVirtualAppointmentDto extends CreateAppointmentDto {
  @IsIn(AUDIO_VIDEO_COMMUNICATION_TYPES, {
    message: "communicationType must be audio or video",
  })
  @IsValidScheduledStartTimeVirtual()
  communicationType: EAppointmentCommunicationType;

  @IsIn([EAppointmentInterpretingType.CONSECUTIVE, EAppointmentInterpretingType.SIGN_LANGUAGE])
  @IsValidServiceCombination()
  interpretingType: EAppointmentInterpretingType;

  @IsBoolean()
  @IsAlternativePlatformValid()
  alternativePlatform: boolean;

  @IsValidAlternativePlatform()
  alternativeVideoConferencingPlatformLink?: string;

  @ValidateNested({ each: true })
  @Type(() => CreateExtraDayVirtualDto)
  @IsValidSchedulingExtraDays()
  @IsExtraDaysGapValid()
  schedulingExtraDays?: CreateExtraDayVirtualDto[];
}
