import { Length } from "class-validator";
import { BaseUpdateAttendeeCapabilitiesDto } from "src/modules/chime-meeting-configuration/common/dto";
import { IsAwsChimeAttendeeId } from "src/modules/chime-meeting-configuration/common/validators";

export class UpdateAttendeeCapabilitiesDto extends BaseUpdateAttendeeCapabilitiesDto {
  @IsAwsChimeAttendeeId()
  @Length(36, 36)
  attendeeId: string;
}
