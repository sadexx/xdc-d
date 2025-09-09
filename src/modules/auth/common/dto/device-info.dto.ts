import { IsEnum, IsNotEmpty, IsString, Length, ValidateIf } from "class-validator";
import { EPlatformType } from "src/modules/sessions/common/enum";

export class DeviceInfoDto {
  @IsEnum(EPlatformType)
  platform: EPlatformType;

  @IsNotEmpty()
  @IsString()
  @Length(1, 250)
  deviceId: string;

  @ValidateIf((obj) => (obj as Partial<DeviceInfoDto>).deviceToken !== null)
  @IsString()
  @Length(1, 250)
  deviceToken: string | null;

  @ValidateIf((obj) => (obj as Partial<DeviceInfoDto>).iosVoipToken !== null)
  @IsString()
  @Length(1, 250)
  iosVoipToken: string | null;
}
