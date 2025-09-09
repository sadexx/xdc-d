import { PaginationQueryDto } from "src/common/dto";
import { IsOptional, IsString, IsUUID } from "class-validator";

export class GetContractsDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  @IsString()
  userId?: string;
}
