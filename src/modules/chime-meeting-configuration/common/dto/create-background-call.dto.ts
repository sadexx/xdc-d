import { ArrayNotEmpty, ArrayUnique, IsArray, IsEnum, IsOptional } from "class-validator";
import { EBackgroundCallType } from "src/modules/chime-meeting-configuration/common/enums";
import { IsAwsChimeAttendeeId } from "src/modules/chime-meeting-configuration/common/validators";

export class CreateBackgroundCallDto {
  @IsEnum(EBackgroundCallType)
  callType: EBackgroundCallType;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty({ message: "inActiveAttendeeIds array must not be empty" })
  @IsAwsChimeAttendeeId({ each: true, message: "Each inActiveAttendeeId must be a valid AWS Chime Attendee ID" })
  @ArrayUnique()
  inActiveAttendeeIds?: string[];
}
