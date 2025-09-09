import { IsNumber, IsOptional, Min } from "class-validator";

export class UpdateMembershipPriceDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  gstAmount?: number;
}
