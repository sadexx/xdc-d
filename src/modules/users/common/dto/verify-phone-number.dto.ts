import { IsString } from "class-validator";

export class VerifyPhoneNumberDto {
  @IsString()
  verificationCode: string;
}
