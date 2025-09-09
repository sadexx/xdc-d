import { IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";
import { PaginationQueryDto } from "src/common/dto";
import { EAccountStatus, EUserRoleName } from "src/modules/users/common/enums";
import { ESortOrder } from "src/common/enums";
import { CommaSeparatedToArray } from "src/common/decorators";
import { ALLOWED_EMPLOYEE_ROLES, CORPORATE_SUPER_ADMIN_ROLES } from "src/common/constants";

export class GetEmployeesDto extends PaginationQueryDto {
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
