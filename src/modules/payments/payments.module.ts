import { forwardRef, Module } from "@nestjs/common";
import { RatesModule } from "src/modules/rates/rates.module";
import { DiscountsModule } from "src/modules/discounts/discounts.module";
import { AppointmentFailedPaymentCancelModule } from "src/modules/appointments/failed-payment-cancel/appointment-failed-payment-cancel.module";
import { NotificationModule } from "src/modules/notifications/notification.module";
import { StripeModule } from "src/modules/stripe/stripe.module";
import { CompaniesDepositChargeModule } from "src/modules/companies-deposit-charge/companies-deposit-charge.module";
import { EmailsModule } from "src/modules/emails/emails.module";
import { AppointmentOrdersSharedModule } from "src/modules/appointment-orders/shared/appointment-orders-shared.module";
import { QueueModule } from "src/modules/queues/queues.module";
import { PaypalModule } from "src/modules/paypal/paypal.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { IncomingPaymentWaitList, Payment } from "src/modules/payments/entities";
import { AppointmentsSharedModule } from "src/modules/appointments/shared/appointments-shared.module";
import { PaymentsController } from "src/modules/payments/controllers";
import { UserRole } from "src/modules/users/entities";
import { AwsS3Module } from "src/modules/aws/s3/aws-s3.module";
import { RedisModule } from "src/modules/redis/redis.module";
import {
  PaymentsNotificationService,
  PaymentsValidationFailedService,
  PaymentsExternalOperationsService,
  PaymentsQueryOptionsService,
  PaymentsFinalFailureService,
  PaymentsAuthorizationService,
  PaymentsAuthorizationCancelService,
  PaymentsCorporateDepositService,
  PaymentsCorporateSameCompanyCommissionService,
  PaymentsCaptureService,
  PaymentsCorporatePayoutService,
  PaymentsExecutionService,
  PaymentsGeneralService,
  PaymentsManagementService,
  PaymentsPriceCalculationService,
  PaymentsPriceRecalculationService,
  PaymentsTransferService,
  PaymentsWaitListService,
} from "src/modules/payments/services";

@Module({
  imports: [
    TypeOrmModule.forFeature([IncomingPaymentWaitList, Payment, UserRole]),
    forwardRef(() => CompaniesDepositChargeModule),
    RatesModule,
    DiscountsModule,
    AppointmentFailedPaymentCancelModule,
    NotificationModule,
    StripeModule,
    EmailsModule,
    AppointmentOrdersSharedModule,
    QueueModule,
    PaypalModule,
    AppointmentsSharedModule,
    AwsS3Module,
    RedisModule,
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
    PaymentsGeneralService,
    PaymentsQueryOptionsService,
    PaymentsCorporatePayoutService,
    PaymentsFinalFailureService,
  ],
  controllers: [PaymentsController],
  exports: [
    PaymentsManagementService,
    PaymentsPriceCalculationService,
    PaymentsPriceRecalculationService,
    PaymentsExecutionService,
    PaymentsExternalOperationsService,
    PaymentsWaitListService,
    PaymentsCorporatePayoutService,
    PaymentsFinalFailureService,
  ],
})
export class PaymentsModule {}
