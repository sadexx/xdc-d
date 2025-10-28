import { forwardRef, Module } from "@nestjs/common";
import {
  PaymentsAuthorizationService,
  PaymentsPriceCalculationService,
  PaymentsCorporateDepositService,
  PaymentsExecutionService,
  PaymentsNotificationService,
  PaymentsCreationService,
  PaymentsValidationFailedService,
  PaymentsWaitListService,
  PaymentsPriceRecalculationService,
} from "src/modules/payments-new/services";
import { RatesModule } from "src/modules/rates/rates.module";
import { DiscountsModule } from "src/modules/discounts/discounts.module";
import { AppointmentFailedPaymentCancelModule } from "src/modules/appointments/failed-payment-cancel/appointment-failed-payment-cancel.module";
import { NotificationModule } from "src/modules/notifications/notification.module";
import { StripeModule } from "src/modules/stripe/stripe.module";
import { CompaniesDepositChargeModule } from "src/modules/companies-deposit-charge/companies-deposit-charge.module";
import { EmailsModule } from "src/modules/emails/emails.module";
import { AppointmentOrdersSharedModule } from "src/modules/appointment-orders/shared/appointment-orders-shared.module";
import { AppointmentsSharedModule } from "src/modules/appointments/shared/appointments-shared.module";

@Module({
  imports: [
    forwardRef(() => CompaniesDepositChargeModule),
    RatesModule,
    DiscountsModule,
    AppointmentFailedPaymentCancelModule,
    NotificationModule,
    StripeModule,
    EmailsModule,
    AppointmentsSharedModule,
    AppointmentOrdersSharedModule,
  ],
  providers: [
    PaymentsCreationService,
    PaymentsPriceCalculationService,
    PaymentsPriceRecalculationService,
    PaymentsExecutionService,
    PaymentsAuthorizationService,
    PaymentsCorporateDepositService,
    PaymentsNotificationService,
    PaymentsValidationFailedService,
    PaymentsWaitListService,
  ],
  exports: [
    PaymentsCreationService,
    PaymentsPriceCalculationService,
    PaymentsPriceRecalculationService,
    PaymentsExecutionService,
  ],
})
export class PaymentsModule {}
