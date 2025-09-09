import { IsEmail, IsLowercase, MinLength } from "class-validator";

export class SuperAdminRegistrationDto {
  @IsEmail()
  @IsLowercase()
  @MinLength(6)
  email: string;
}
