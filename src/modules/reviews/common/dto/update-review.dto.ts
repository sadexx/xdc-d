import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";
import { EPromoAndReviewOrder } from "src/modules/content-management/common/enums";

export class UpdateReviewDto {
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  userName?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  review?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsNumber()
  rating?: number;

  @IsEnum(EPromoAndReviewOrder)
  ordinalNumber: EPromoAndReviewOrder;
}
