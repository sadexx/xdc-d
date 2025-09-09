import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ELandingUiLanguage, EPromoAndReviewOrder } from "src/modules/content-management/common/enums";

export class CreatePromoDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  image?: string;

  @IsEnum(ELandingUiLanguage)
  language: ELandingUiLanguage;

  @IsEnum(EPromoAndReviewOrder)
  ordinalNumber: EPromoAndReviewOrder;
}
