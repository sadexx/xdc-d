import { ArrayNotEmpty, ArrayUnique, IsArray, IsUUID } from "class-validator";

export class MarkPaymentsInvoicedDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID(4, { each: true })
  paymentIds: string[];

  @IsUUID(4)
  companyId: string;
}
