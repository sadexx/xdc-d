import { IsEnum, IsString, IsUUID } from "class-validator";
import { EManualCheckResult } from "src/modules/backy-check/common/enums";

export class StatusManualDecisionDto {
  @IsUUID()
  @IsString()
  id: string;

  @IsEnum(EManualCheckResult)
  @IsString()
  status: EManualCheckResult;
}
