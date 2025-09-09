import { IsString, IsUUID } from "class-validator";

export class DownloadContractDto {
  @IsUUID()
  @IsString()
  id: string;
}
