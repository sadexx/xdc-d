import { Module } from "@nestjs/common";
import { OldPaymentsController } from "src/modules/payments/controllers";
import {
  OldCorporatePaymentsService,
  OldGeneralPaymentsService,
  OldIndividualPaymentsService,
  OldPaymentsHelperService,
} from "src/modules/payments/services";
import { PdfModule } from "src/modules/pdf/pdf.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OldPayment, OldPaymentItem, OldIncomingPaymentsWaitList } from "src/modules/payments/entities";
import { UserRole } from "src/modules/users/entities";
import { Appointment, AppointmentAdminInfo } from "src/modules/appointments/appointment/entities";
import { StripeModule } from "src/modules/stripe/stripe.module";
import { AwsS3Module } from "src/modules/aws/s3/aws-s3.module";
import { EmailsModule } from "src/modules/emails/emails.module";
import { PaypalModule } from "src/modules/paypal/paypal.module";
import { OldRatesModule } from "src/modules/rates-old/old-rates.module";
import { DiscountsModule } from "src/modules/discounts/discounts.module";
import { NotificationModule } from "src/modules/notifications/notification.module";
import { AppointmentFailedPaymentCancelModule } from "src/modules/appointments/failed-payment-cancel/appointment-failed-payment-cancel.module";
import { HelperModule } from "src/modules/helper/helper.module";
import { OldPaymentsQueryOptionsService } from "src/modules/payments/services/old-payments-query-options.service";
import { Company } from "src/modules/companies/entities";
import { CompaniesDepositChargeModule } from "src/modules/companies-deposit-charge/companies-deposit-charge.module";
import { User } from "src/modules/users/entities";
import { AppointmentsSharedModule } from "src/modules/appointments/shared/appointments-shared.module";
import { AccessControlModule } from "src/modules/access-control/access-control.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OldPayment,
      UserRole,
      Appointment,
      OldPaymentItem,
      OldIncomingPaymentsWaitList,
      Company,
      User,
      AppointmentAdminInfo,
    ]),
    PdfModule,
    StripeModule,
    AwsS3Module,
    EmailsModule,
    PaypalModule,
    OldRatesModule,
    DiscountsModule,
    NotificationModule,
    AppointmentFailedPaymentCancelModule,
    HelperModule,
    CompaniesDepositChargeModule,
    AppointmentsSharedModule,
    AccessControlModule,
  ],
  providers: [
    OldIndividualPaymentsService,
    OldGeneralPaymentsService,
    OldPaymentsQueryOptionsService,
    OldCorporatePaymentsService,
    OldPaymentsHelperService,
  ],
  controllers: [OldPaymentsController],
  exports: [OldGeneralPaymentsService, OldCorporatePaymentsService, OldPaymentsHelperService],
})
export class OldPaymentsModule {}
