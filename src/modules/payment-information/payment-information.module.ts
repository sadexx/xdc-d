import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PaymentInformation } from "src/modules/payment-information/entities";
import { UserRole } from "src/modules/users/entities";
import { StripeModule } from "src/modules/stripe/stripe.module";
import { ActivationTrackingModule } from "src/modules/activation-tracking/activation-tracking.module";
import { PaypalModule } from "src/modules/paypal/paypal.module";
import {
  CorporatePaymentInformationService,
  GeneralPaymentInformationService,
  IndividualPaymentInformationService,
  PaymentInformationQueryOptionsService,
} from "src/modules/payment-information/services";
import {
  CorporatePaymentInformationController,
  GeneralPaymentInformationController,
  IndividualPaymentInformationController,
} from "src/modules/payment-information/controllers";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { AccessControlModule } from "src/modules/access-control/access-control.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentInformation, UserRole, Appointment]),
    StripeModule,
    ActivationTrackingModule,
    PaypalModule,
    AccessControlModule,
  ],
  providers: [
    IndividualPaymentInformationService,
    CorporatePaymentInformationService,
    GeneralPaymentInformationService,
    PaymentInformationQueryOptionsService,
  ],
  controllers: [
    IndividualPaymentInformationController,
    CorporatePaymentInformationController,
    GeneralPaymentInformationController,
  ],
  exports: [GeneralPaymentInformationService],
})
export class PaymentInformationModule {}
