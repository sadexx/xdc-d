import { IsEnum } from "class-validator";
import { EPaymentSystem } from "src/modules/payments-new/common/enums";

export class SetDefaultPayOutMethodDto {
  @IsEnum(EPaymentSystem)
  paymentSystem?: EPaymentSystem;
}
