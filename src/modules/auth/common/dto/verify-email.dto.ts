import { IsNotEmpty, IsString } from "class-validator";

export class VerifyEmail {
  @IsString()
  @IsNotEmpty()
  verificationCode: string;
}
