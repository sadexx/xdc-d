import { Type } from "class-transformer";
import { IsOptional, IsUUID, ValidateNested } from "class-validator";
import { UpdateUserProfileInformationDto } from "src/modules/users/common/dto";
import { UpdateAddressDto } from "src/modules/addresses/common/dto";

export class UpdateUserProfileDto {
  @IsOptional()
  @IsUUID()
  userRoleId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateUserProfileInformationDto)
  profileInformation?: UpdateUserProfileInformationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateAddressDto)
  residentialAddress?: UpdateAddressDto;
}
