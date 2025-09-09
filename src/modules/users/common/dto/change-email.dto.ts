import { IsEmail, IsLowercase, MinLength } from "class-validator";

export class ChangeEmailDto {
  @IsEmail()
  @IsLowercase()
  @MinLength(6)
  email: string;
}
