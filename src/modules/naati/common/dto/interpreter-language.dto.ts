import { IsEnum } from "class-validator";
import { EExtNaatiLanguages } from "src/modules/naati/common/enum";

export class InterpreterLanguageDto {
  @IsEnum(EExtNaatiLanguages, { message: "The language is not supported." })
  language: EExtNaatiLanguages;
}
