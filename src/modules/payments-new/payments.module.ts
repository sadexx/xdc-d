import { forwardRef, Module } from "@nestjs/common";
import {
  PaymentsAuthorizationService,
  PaymentsPriceCalculationService,
  PaymentsCorporateDepositService,
  PaymentsExecutionService,
  PaymentsNotificationService,
  PaymentsValidationFailedService,
  PaymentsWaitListService,
  PaymentsPriceRecalculationService,
  PaymentsCorporateSameCompanyCommissionService,
  PaymentsTransferService,
  PaymentsCaptureService,
  PaymentsManagementService,
  PaymentsExternalOperationsService,
  PaymentsAuthorizationCancelService,
} from "src/modules/payments-new/services";
import { RatesModule } from "src/modules/rates/rates.module";
import { DiscountsModule } from "src/modules/discounts/discounts.module";
import { AppointmentFailedPaymentCancelModule } from "src/modules/appointments/failed-payment-cancel/appointment-failed-payment-cancel.module";
import { NotificationModule } from "src/modules/notifications/notification.module";
import { StripeModule } from "src/modules/stripe/stripe.module";
import { CompaniesDepositChargeModule } from "src/modules/companies-deposit-charge/companies-deposit-charge.module";
import { EmailsModule } from "src/modules/emails/emails.module";
import { AppointmentOrdersSharedModule } from "src/modules/appointment-orders/shared/appointment-orders-shared.module";
import { PaymentAnalysisModule } from "src/modules/payment-analysis/payment-analysis.module";
import { QueueModule } from "src/modules/queues/queues.module";
import { PaypalModule } from "src/modules/paypal/paypal.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { IncomingPaymentWaitList } from "src/modules/payments-new/entities";

@Module({
  imports: [
    TypeOrmModule.forFeature([IncomingPaymentWaitList]),
    forwardRef(() => CompaniesDepositChargeModule),
    forwardRef(() => PaymentAnalysisModule),
    RatesModule,
    DiscountsModule,
    AppointmentFailedPaymentCancelModule,
    NotificationModule,
    StripeModule,
    EmailsModule,
    AppointmentOrdersSharedModule,
    QueueModule,
    PaypalModule,
  ],
  providers: [
    PaymentsAuthorizationService,
    PaymentsAuthorizationCancelService,
    PaymentsCorporateDepositService,
    PaymentsCaptureService,
    PaymentsCorporateSameCompanyCommissionService,
    PaymentsManagementService,
    PaymentsExecutionService,
    PaymentsNotificationService,
    PaymentsPriceCalculationService,
    PaymentsPriceRecalculationService,
    PaymentsTransferService,
    PaymentsValidationFailedService,
    PaymentsWaitListService,
    PaymentsExternalOperationsService,
  ],
  exports: [
    PaymentsManagementService,
    PaymentsPriceCalculationService,
    PaymentsPriceRecalculationService,
    PaymentsExecutionService,
    PaymentsExternalOperationsService,
  ],
})
export class PaymentsModule {}
