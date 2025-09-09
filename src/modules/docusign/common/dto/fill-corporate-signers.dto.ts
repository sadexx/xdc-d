import { IsEmail, IsEnum, IsLowercase, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from "class-validator";
import { EUserTitle } from "src/modules/users/common/enums";

export class FillCorporateSignersDto {
  @IsOptional()
  @IsUUID()
  @IsString()
  companyId?: string;

  @IsEmail()
  @IsLowercase()
  @MinLength(6)
  mainSignerContactEmail: string;

  @IsOptional()
  @IsEnum(EUserTitle)
  mainSignerTitle?: EUserTitle;

  @IsNotEmpty()
  @IsString()
  mainSignerFirstName: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  mainSignerMiddleName?: string;

  @IsNotEmpty()
  @IsString()
  mainSignerLastName: string;

  @IsOptional()
  @IsNotEmpty()
  @IsEmail()
  @IsLowercase()
  @MinLength(6)
  secondSignerContactEmail?: string;

  @IsOptional()
  @IsEnum(EUserTitle)
  secondSignerTitle?: EUserTitle;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  secondSignerFirstName?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  secondSignerMiddleName?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  secondSignerLastName?: string;
}
