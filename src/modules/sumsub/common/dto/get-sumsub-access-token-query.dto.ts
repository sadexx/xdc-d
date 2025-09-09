import { IsEnum } from "class-validator";
import { EExtSumSubLevelName } from "src/modules/sumsub/common/enums";

export class GetSumSubAccessTokenQueryDto {
  @IsEnum(EExtSumSubLevelName)
  levelName: EExtSumSubLevelName;
}
