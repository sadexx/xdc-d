import { Length } from "class-validator";
import { IsAwsChimeMeetingId } from "src/modules/chime-meeting-configuration/common/validators";

export class BaseGetChimeMeetingParamDto {
  @IsAwsChimeMeetingId()
  @Length(36, 36)
  chimeMeetingId: string;
}
