import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "src/common/dto";

export class GetAppointmentChannels extends PaginationQueryDto {
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  searchField?: string;
}
