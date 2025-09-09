import { IsEnum } from "class-validator";
import { EPaymentSystem } from "src/modules/payment-information/common/enums";

export class SetDefaultPayOutMethodDto {
  @IsEnum(EPaymentSystem)
  paymentSystem?: EPaymentSystem;
}
