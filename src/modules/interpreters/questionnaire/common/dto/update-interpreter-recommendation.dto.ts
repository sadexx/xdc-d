import {
  IsEmail,
  IsLowercase,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  MinLength,
} from "class-validator";
import { NoWhitespaces } from "src/common/decorators";

export class UpdateInterpreterRecommendationDto {
  @IsOptional()
  @IsUUID()
  userRoleId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  companyName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  recommenderFullName?: string;

  @IsOptional()
  @NoWhitespaces()
  @IsPhoneNumber()
  recommenderPhoneNumber?: string;

  @IsOptional()
  @IsEmail()
  @IsLowercase()
  @MinLength(6)
  recommenderEmail?: string;
}
