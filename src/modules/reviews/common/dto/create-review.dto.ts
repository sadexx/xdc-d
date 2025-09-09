import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";
import { EPromoAndReviewOrder } from "src/modules/content-management/common/enums";

export class CreateReviewDto {
  @IsNotEmpty()
  @IsString()
  userName: string;

  @IsNotEmpty()
  @IsString()
  review: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  avatar?: string;

  @IsNumber()
  rating: number;

  @IsEnum(EPromoAndReviewOrder)
  ordinalNumber: EPromoAndReviewOrder;
}
