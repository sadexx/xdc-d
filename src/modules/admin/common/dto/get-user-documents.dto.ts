import { UUIDParamDto } from "src/common/dto";
import { EUserRoleName } from "src/modules/users/common/enums";
import { IsEnum } from "class-validator";

export class GetUserDocumentsDto extends UUIDParamDto {
  @IsEnum(EUserRoleName)
  userRole: EUserRoleName;
}
