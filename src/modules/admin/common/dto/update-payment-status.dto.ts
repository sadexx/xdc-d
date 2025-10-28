import { IsIn } from "class-validator";
import { OldEPaymentStatus } from "src/modules/payments/common/enums";

export class UpdatePaymentStatusDto {
  @IsIn([OldEPaymentStatus.SUCCESS])
  status: OldEPaymentStatus;
}
