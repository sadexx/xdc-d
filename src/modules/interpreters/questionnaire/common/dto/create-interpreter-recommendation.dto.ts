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
import { IsRecommendationContactProvided } from "src/modules/interpreters/questionnaire/common/validators";
import { NoWhitespaces } from "src/common/decorators";

export class CreateInterpreterRecommendationDto {
  @IsOptional()
  @IsUUID()
  userRoleId?: string;

  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsRecommendationContactProvided()
  @IsString()
  @IsNotEmpty()
  recommenderFullName: string;

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
