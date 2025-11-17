import { IsNotEmpty, IsString } from "class-validator";

export class DownloadReceiptDto {
  @IsNotEmpty()
  @IsString()
  receiptKey: string;
}
