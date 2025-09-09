import { IsNotEmpty } from "class-validator";
import { DeviceInfoDto } from "src/modules/auth/common/dto";

export class LoginDto extends DeviceInfoDto {
  @IsNotEmpty()
  identification: string;

  @IsNotEmpty()
  password: string;
}
