import { IsUUID, Length } from "class-validator";
import { ChimeMediaRegionQueryDto } from "src/modules/chime-meeting-configuration/common/dto/chime-media-region.dto";

export class GetChimeMeetingExternalUserDto extends ChimeMediaRegionQueryDto {
  @IsUUID()
  @Length(36, 36)
  externalUserId: string;
}
