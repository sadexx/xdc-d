import { IsEnum, IsOptional } from "class-validator";
import { EMeetingMediaRegion } from "src/modules/chime-meeting-configuration/common/enums";

export class ChimeMediaRegionQueryDto {
  @IsOptional()
  @IsEnum(EMeetingMediaRegion)
  mediaRegion?: EMeetingMediaRegion;
}
