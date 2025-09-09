import { IsEnum, IsString, IsUUID } from "class-validator";
import { ERightToWorkCheckStatus } from "src/modules/right-to-work-check/common/enums";

export class RightToWorkCheckManualDecisionDto {
  @IsUUID()
  id: string;

  @IsEnum(ERightToWorkCheckStatus)
  @IsString()
  status: ERightToWorkCheckStatus;
}
