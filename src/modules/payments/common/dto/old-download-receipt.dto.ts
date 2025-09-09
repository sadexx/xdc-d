import { IsNotEmpty, IsString } from "class-validator";

export class OldDownloadReceiptDto {
  @IsNotEmpty()
  @IsString()
  receiptKey: string;
}
