import { CreateAddressDto } from "src/modules/addresses/common/dto";
import { Type } from "class-transformer";
import { IsOptional, IsUUID, ValidateNested } from "class-validator";
import { CreateUserProfileInformationDto } from "src/modules/users/common/dto";

export class CreateUserProfileDto {
  @IsOptional()
  @IsUUID()
  userRoleId?: string;

  @ValidateNested()
  @Type(() => CreateUserProfileInformationDto)
  profileInformation: CreateUserProfileInformationDto;

  @ValidateNested()
  @Type(() => CreateAddressDto)
  residentialAddress: CreateAddressDto;
}
