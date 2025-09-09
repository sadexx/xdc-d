import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "src/common/dto";
import { EChannelType } from "src/modules/chime-messaging-configuration/common/enums";

export class GetAdminChannelsDto extends PaginationQueryDto {
  @IsNotEmpty()
  @IsEnum(EChannelType)
  type: EChannelType;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  searchField?: string;
}
