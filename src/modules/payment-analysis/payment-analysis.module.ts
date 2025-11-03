import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PaymentAnalysisService, PaymentStrategyService } from "src/modules/payment-analysis/services";
import {
  AuthorizationContextService,
  AuthorizationContextValidationService,
  AuthorizationContextQueryOptionsService,
} from "src/modules/payment-analysis/services/authorization";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { Company } from "src/modules/companies/entities";
import { IncomingPaymentWaitList, Payment } from "src/modules/payments-new/entities";
import { PaymentsModule } from "src/modules/payments-new/payments.module";
import { QueueModule } from "src/modules/queues/queues.module";
import {
  CaptureContextQueryOptionsService,
  CaptureContextService,
  CaptureContextValidationService,
} from "src/modules/payment-analysis/services/capture";
import {
  TransferContextQueryOptionsService,
  TransferContextService,
  TransferContextValidationService,
} from "src/modules/payment-analysis/services/transfer";
import {
  AuthorizationCancelContextQueryOptionsService,
  AuthorizationCancelContextService,
  AuthorizationCancelContextValidationService,
} from "src/modules/payment-analysis/services/authorization-cancel";
import { AppointmentsSharedModule } from "src/modules/appointments/shared/appointments-shared.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment, Company, Payment, IncomingPaymentWaitList]),
    forwardRef(() => PaymentsModule),
    QueueModule,
    AppointmentsSharedModule,
  ],
  providers: [
    PaymentAnalysisService,
    PaymentStrategyService,

    AuthorizationContextService,
    AuthorizationContextValidationService,
    AuthorizationContextQueryOptionsService,

    AuthorizationCancelContextService,
    AuthorizationCancelContextValidationService,
    AuthorizationCancelContextQueryOptionsService,

    CaptureContextService,
    CaptureContextValidationService,
    CaptureContextQueryOptionsService,

    TransferContextService,
    TransferContextValidationService,
    TransferContextQueryOptionsService,
  ],
  exports: [PaymentAnalysisService],
})
export class PaymentAnalysisModule {}
