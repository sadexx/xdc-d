import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";
import { PaginationQueryDto } from "src/common/dto";
import { OldEPaymentMethod, OldEPaymentStatus, OldEReceiptType } from "src/modules/payments/common/enums";
import { ESortOrder } from "src/common/enums";
import { CommaSeparatedToArray } from "src/common/decorators";

export class GetUserPaymentsDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  userRoleId?: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsEnum(OldEReceiptType)
  receiptType?: OldEReceiptType;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  searchField?: string;

  @IsOptional()
  @CommaSeparatedToArray()
  @IsEnum(OldEPaymentStatus, { each: true })
  statuses?: OldEPaymentStatus[];

  @IsOptional()
  @CommaSeparatedToArray()
  @IsEnum(OldEPaymentMethod, { each: true })
  paymentMethod?: OldEPaymentMethod;

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
