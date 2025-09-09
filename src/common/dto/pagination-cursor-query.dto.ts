import { Type } from "class-transformer";
import { IsDateString, IsOptional, IsPositive, Max, Min } from "class-validator";

export class PaginationCursorQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  @Min(1)
  @Max(50)
  limit: number = 10;

  @IsOptional()
  @IsDateString()
  cursor?: Date;
}
