import { IsEnum, IsString, IsUUID } from "class-validator";
import { EUserConcessionCardStatus } from "src/modules/concession-card/common/enums";

export class ConcessionCardManualDecisionDto {
  @IsUUID()
  @IsString()
  id: string;

  @IsEnum(EUserConcessionCardStatus)
  @IsString()
  status: EUserConcessionCardStatus;
}
