import { ERegistrableUserRoleName, EUserRoleName } from "src/modules/users/common/enums";
import { IsEnum, IsJWT, IsOptional } from "class-validator";
import { DeviceInfoDto } from "src/modules/auth/common/dto";

export class ThirdPartyMobileAuthDto extends DeviceInfoDto {
  @IsOptional()
  @IsEnum(ERegistrableUserRoleName)
  role: EUserRoleName;

  @IsJWT()
  idToken: string;
}
