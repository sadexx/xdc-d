import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { EChannelType } from "src/modules/chime-messaging-configuration/common/enums";
import { PaginationCursorQueryDto } from "src/common/dto";

export class GetUserChannelsDto extends PaginationCursorQueryDto {
  @IsNotEmpty()
  @IsEnum(EChannelType)
  type: EChannelType;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  searchField?: string;
}
