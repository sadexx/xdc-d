import { IsEnum } from "class-validator";
import { EExtMediaCapabilities } from "src/modules/chime-meeting-configuration/common/enums";

export class BaseUpdateAttendeeCapabilitiesDto {
  @IsEnum(EExtMediaCapabilities)
  audioCapabilities: EExtMediaCapabilities;

  @IsEnum(EExtMediaCapabilities)
  videoCapabilities: EExtMediaCapabilities;

  @IsEnum(EExtMediaCapabilities)
  contentCapabilities: EExtMediaCapabilities;
}
