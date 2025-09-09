import { IsNotEmpty, IsString } from "class-validator";

export class VerifyPhoneNumberDto {
  @IsString()
  @IsNotEmpty()
  verificationCode: string;
}
