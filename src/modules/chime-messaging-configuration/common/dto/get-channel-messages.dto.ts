import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class GetChannelMessagesDto {
  @IsNotEmpty()
  @IsString()
  channelArn: string;

  @IsOptional()
  @IsString()
  nextToken?: string;
}
