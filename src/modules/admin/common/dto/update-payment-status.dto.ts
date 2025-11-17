import { IsIn } from "class-validator";
import { EPaymentStatus } from "src/modules/payments/common/enums/core";

export class UpdatePaymentStatusDto {
  @IsIn([EPaymentStatus.SUCCESS])
  status: EPaymentStatus;
}
