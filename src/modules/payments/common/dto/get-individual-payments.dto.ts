import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "src/common/dto";
import { CommaSeparatedToArray } from "src/common/decorators";
import { ESortOrder } from "src/common/enums";
import { EPaymentMethod, EPaymentReceiptType, EPaymentStatus } from "src/modules/payments/common/enums/core";

export class GetIndividualPaymentsDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(EPaymentReceiptType)
  receiptType?: EPaymentReceiptType;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  searchField?: string;

  @IsOptional()
  @CommaSeparatedToArray()
  @IsEnum(EPaymentStatus, { each: true })
  statuses?: EPaymentStatus[];

  @IsOptional()
  @CommaSeparatedToArray()
  @IsEnum(EPaymentMethod, { each: true })
  paymentMethod?: EPaymentMethod;

  @IsOptional()
  @IsDateString()
  startDate?: Date;

  @IsOptional()
  @IsDateString()
  endDate?: Date;

  @IsOptional()
  @IsEnum(ESortOrder)
  invoiceNumberOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  amountOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  appointmentDateOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  dueDateOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  statusOrder?: ESortOrder;
}
