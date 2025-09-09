import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";
import { ELanguages } from "src/modules/interpreters/profile/common/enum";

export class CreateRightToWorkCheckDto {
  @IsUUID()
  @IsOptional()
  userRoleId?: string;

  @IsNotEmpty()
  @IsEnum(ELanguages, { message: 'Invalid "from" language provided' })
  languageFrom: ELanguages;

  @IsNotEmpty()
  @IsEnum(ELanguages, { message: 'Invalid "to" language provided' })
  languageTo: ELanguages;

  @IsNotEmpty()
  @IsString()
  documentName: string;
}
