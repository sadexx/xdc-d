import { IsEnum } from "class-validator";
import { EPaymentSystem } from "src/modules/payments/common/enums/core";

export class SetDefaultPayOutMethodDto {
  @IsEnum(EPaymentSystem)
  paymentSystem?: EPaymentSystem;
}
