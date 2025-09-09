import { Length } from "class-validator";
import { BaseGetChimeMeetingParamDto } from "src/modules/chime-meeting-configuration/common/dto";
import { IsAwsChimeAttendeeId } from "src/modules/chime-meeting-configuration/common/validators";

export class GetChimeMeetingParamDto extends BaseGetChimeMeetingParamDto {
  @IsAwsChimeAttendeeId()
  @Length(36, 36)
  attendeeId: string;
}
