import { IsString } from "class-validator";
import { ChangeEmailDto } from "src/modules/users/common/dto";

export class VerifyEmailDto extends ChangeEmailDto {
  @IsString()
  verificationCode: string;
}
