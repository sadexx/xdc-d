import { IsUUID, Length } from "class-validator";
import { IsAwsChimeAttendeeId } from "src/modules/chime-meeting-configuration/common/validators";

export class UpdateAttendeeStatusParamDto {
  @IsUUID()
  @Length(36, 36)
  id: string;

  @IsAwsChimeAttendeeId()
  @Length(36, 36)
  attendeeId: string;
}
