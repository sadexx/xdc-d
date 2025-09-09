import { IsString } from "class-validator";

export class VerifyPasswordResetCodeDto {
  @IsString()
  phone: string;

  @IsString()
  code: string;
}
