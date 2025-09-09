import { IsEmail, IsEnum, IsLowercase, MinLength } from "class-validator";
import { ERegistrableUserRoleName, EUserRoleName } from "src/modules/users/common/enums";

export class RegisterUserDto {
  @IsEnum(ERegistrableUserRoleName)
  role: EUserRoleName;

  @IsEmail()
  @IsLowercase()
  @MinLength(6)
  email: string;
}
