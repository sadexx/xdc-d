import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { DeviceInfoDto } from "src/modules/auth/common/dto";

export class RefreshTokensDto extends DeviceInfoDto {
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  refreshToken?: string;
}
