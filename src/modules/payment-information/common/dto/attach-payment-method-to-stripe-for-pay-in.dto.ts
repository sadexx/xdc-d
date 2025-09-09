import { IsNotEmpty, IsString, Length } from "class-validator";

export class AttachPaymentMethodToStripeForPayInDto {
  @IsNotEmpty()
  @IsString()
  paymentMethodId: string;

  @IsNotEmpty()
  @IsString()
  customerId: string;

  @IsString()
  @Length(4, 4)
  lastFour: string;
}
