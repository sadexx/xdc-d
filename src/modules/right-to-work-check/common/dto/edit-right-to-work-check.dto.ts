import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";
import { ELanguages } from "src/modules/interpreters/profile/common/enum";

export class EditRightToWorkCheckDto {
  @IsUUID()
  id: string;

  @IsOptional()
  @IsEnum(ELanguages, { message: 'Invalid "from" language provided' })
  languageFrom?: ELanguages;

  @IsOptional()
  @IsEnum(ELanguages, { message: 'Invalid "to" language provided' })
  languageTo?: ELanguages;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  documentName?: string;
}
