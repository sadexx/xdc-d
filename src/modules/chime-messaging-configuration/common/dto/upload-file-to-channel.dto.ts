import { IsEnum, IsNotEmpty } from "class-validator";
import { UUIDParamDto } from "src/common/dto";
import { EChannelType } from "src/modules/chime-messaging-configuration/common/enums";

export class UploadFileToChannelDto extends UUIDParamDto {
  @IsNotEmpty()
  @IsEnum(EChannelType)
  channelType: EChannelType;
}
