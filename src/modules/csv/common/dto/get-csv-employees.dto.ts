import { IsOptional, IsNotEmpty, IsString, IsUUID, IsEnum, IsIn } from "class-validator";
import { ALLOWED_EMPLOYEE_ROLES, CORPORATE_SUPER_ADMIN_ROLES } from "src/common/constants";
import { CommaSeparatedToArray } from "src/common/decorators";
import { ESortOrder } from "src/common/enums";
import { EAccountStatus, EUserRoleName } from "src/modules/users/common/enums";

export class GetCsvEmployeesDto {
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  searchField?: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @CommaSeparatedToArray()
  @IsEnum(EAccountStatus, { each: true })
  statuses?: EAccountStatus[];

  @IsOptional()
  @CommaSeparatedToArray()
  @IsIn([...ALLOWED_EMPLOYEE_ROLES, ...CORPORATE_SUPER_ADMIN_ROLES], { each: true })
  roles?: EUserRoleName[];

  @IsOptional()
  @IsEnum(ESortOrder)
  sortOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  accountStatusOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  nameOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  userRoleOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  phoneNumberOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  emailOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  suburbOrder?: ESortOrder;
}
