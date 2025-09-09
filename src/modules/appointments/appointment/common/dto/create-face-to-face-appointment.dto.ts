import { Type } from "class-transformer";
import { IsEnum, IsIn, IsNotEmpty, ValidateNested } from "class-validator";
import { CreateFaceToFaceAppointmentAddressDto } from "src/modules/addresses/common/dto";
import {
  EAppointmentCommunicationType,
  EAppointmentInterpretingType,
} from "src/modules/appointments/appointment/common/enums";
import { CreateAppointmentDto, CreateExtraDayFaceToFaceDto } from "src/modules/appointments/appointment/common/dto";
import {
  IsAlternativePlatformNotAllowed,
  IsValidScheduledStartTimeFaceToFace,
  IsValidSchedulingExtraDays,
} from "src/modules/appointments/appointment/common/validators";
import { IsExtraDaysGapValid, IsValidServiceCombination } from "src/modules/appointments/shared/common/validators";

export class CreateFaceToFaceAppointmentDto extends CreateAppointmentDto {
  @IsIn([EAppointmentCommunicationType.FACE_TO_FACE], {
    message: "communicationType must be face-to-face",
  })
  @IsValidScheduledStartTimeFaceToFace()
  communicationType: EAppointmentCommunicationType;

  @IsEnum(EAppointmentInterpretingType)
  @IsValidServiceCombination()
  interpretingType: EAppointmentInterpretingType;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CreateFaceToFaceAppointmentAddressDto)
  address: CreateFaceToFaceAppointmentAddressDto;

  @ValidateNested({ each: true })
  @Type(() => CreateExtraDayFaceToFaceDto)
  @IsValidSchedulingExtraDays()
  @IsExtraDaysGapValid()
  schedulingExtraDays?: CreateExtraDayFaceToFaceDto[];

  @IsAlternativePlatformNotAllowed()
  alternativePlatform: boolean = false;

  @IsAlternativePlatformNotAllowed()
  alternativeVideoConferencingPlatformLink: string;
}
