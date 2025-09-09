import { IsEmail, IsEnum, IsLowercase, IsOptional, IsPhoneNumber, MinLength, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { CreateUserProfileInformationDto } from "src/modules/users/common/dto";
import { CreateAddressDto } from "src/modules/addresses/common/dto";
import { EUserRoleName } from "src/modules/users/common/enums";
import { ERegistrableLinkUserRoleName } from "src/modules/admin/common/enums";
import { IsProfileAndAddressRequiredForRegistrationLink } from "src/modules/auth/common/validators";
import { NoWhitespaces } from "src/common/decorators";

export class SendRegistrationLinkDto {
  @IsEnum(ERegistrableLinkUserRoleName)
  @IsProfileAndAddressRequiredForRegistrationLink()
  role: EUserRoleName;

  @IsEmail()
  @IsLowercase()
  @MinLength(6)
  email: string;

  @IsOptional()
  @NoWhitespaces()
  @IsPhoneNumber()
  phoneNumber?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateUserProfileInformationDto)
  profileInformation?: CreateUserProfileInformationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAddressDto)
  address?: CreateAddressDto;
}
