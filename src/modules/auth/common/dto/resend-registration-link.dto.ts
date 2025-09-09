import { IsEmail, IsEnum, IsLowercase, MinLength } from "class-validator";
import { ERegistrableLinkUserRoleName } from "src/modules/admin/common/enums";
import { EUserRoleName } from "src/modules/users/common/enums";

export class ResendRegistrationLinkDto {
  @IsEnum(ERegistrableLinkUserRoleName)
  role: EUserRoleName;

  @IsEmail()
  @IsLowercase()
  @MinLength(6)
  email: string;
}
