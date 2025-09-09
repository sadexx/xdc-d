import { IsEnum, IsNotEmpty, IsOptional } from "class-validator";
import { EExtInterpreterLevel } from "src/modules/naati/common/enum";
import { ELanguages } from "src/modules/interpreters/profile/common/enum";

export class LanguagePairDto {
  @IsNotEmpty()
  @IsEnum(ELanguages, { message: 'Invalid "from" language provided' })
  from: ELanguages;

  @IsNotEmpty()
  @IsEnum(ELanguages, { message: 'Invalid "to" language provided' })
  to: ELanguages;

  @IsOptional()
  @IsNotEmpty()
  @IsEnum(EExtInterpreterLevel, { message: "Invalid interpreter level provided" })
  interpreterLevel?: EExtInterpreterLevel;
}
