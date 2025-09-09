import {
  IsEmail,
  IsIn,
  IsLowercase,
  IsOptional,
  IsPhoneNumber,
  IsUUID,
  MinLength,
  ValidateNested,
} from "class-validator";
import { EUserRoleName } from "src/modules/users/common/enums";
import { Type } from "class-transformer";
import { CreateUserProfileInformationDto } from "src/modules/users/common/dto";
import { ALLOWED_EMPLOYEE_ROLES } from "src/common/constants";
import { NoWhitespaces } from "src/common/decorators";

export class CreateEmployeeDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsIn(ALLOWED_EMPLOYEE_ROLES)
  role: EUserRoleName;

  @IsEmail()
  @IsLowercase()
  @MinLength(6)
  email: string;

  @NoWhitespaces()
  @IsPhoneNumber()
  phoneNumber: string;

  @ValidateNested()
  @Type(() => CreateUserProfileInformationDto)
  profileInformation: CreateUserProfileInformationDto;
}
