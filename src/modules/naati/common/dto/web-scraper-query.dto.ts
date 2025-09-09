import { IsEnum } from "class-validator";
import { EExtNaatiInterpreterType } from "src/modules/naati/common/enum";

export class WebScraperQueryDto {
  @IsEnum(EExtNaatiInterpreterType)
  interpreterType: EExtNaatiInterpreterType;
}
