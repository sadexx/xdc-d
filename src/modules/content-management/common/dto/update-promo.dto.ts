import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";
import { EPromoAndReviewOrder } from "src/modules/content-management/common/enums";

export class UpdatePromoDto {
  @IsUUID()
  id: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  title?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  image?: string;

  @IsEnum(EPromoAndReviewOrder)
  ordinalNumber: EPromoAndReviewOrder;
}
