import { Type } from "class-transformer";
import { IsEnum, IsOptional, IsPositive, Max, Min } from "class-validator";
import { ESortOrder } from "src/common/enums";

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  offset: number = 0;

  @IsOptional()
  @IsEnum(ESortOrder)
  sortOrder?: ESortOrder;
}
