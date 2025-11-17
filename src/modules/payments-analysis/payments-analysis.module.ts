import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PaymentAnalysisService, PaymentStrategyService } from "src/modules/payments-analysis/services/core";
import {
  AuthorizationContextService,
  AuthorizationContextValidationService,
  AuthorizationContextQueryOptionsService,
} from "src/modules/payments-analysis/services/authorization";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { Company } from "src/modules/companies/entities";
import { IncomingPaymentWaitList, Payment } from "src/modules/payments/entities";
import { PaymentsModule } from "src/modules/payments/payments.module";
import { QueueModule } from "src/modules/queues/queues.module";
import {
  CaptureContextQueryOptionsService,
  CaptureContextService,
  CaptureContextValidationService,
} from "src/modules/payments-analysis/services/capture";
import {
  TransferContextQueryOptionsService,
  TransferContextService,
  TransferContextValidationService,
} from "src/modules/payments-analysis/services/transfer";
import {
  AuthorizationCancelContextQueryOptionsService,
  AuthorizationCancelContextService,
  AuthorizationCancelContextValidationService,
} from "src/modules/payments-analysis/services/authorization-cancel";
import { AppointmentsSharedModule } from "src/modules/appointments/shared/appointments-shared.module";
import {
  AuthorizationRecreateContextQueryOptions,
  AuthorizationRecreateContextService,
} from "src/modules/payments-analysis/services/authorization-recreate";

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment, Company, Payment, IncomingPaymentWaitList]),
    PaymentsModule,
    QueueModule,
    AppointmentsSharedModule,
  ],
  providers: [
    PaymentAnalysisService,
    PaymentStrategyService,

    AuthorizationContextService,
    AuthorizationContextValidationService,
    AuthorizationContextQueryOptionsService,

    AuthorizationRecreateContextService,
    AuthorizationRecreateContextQueryOptions,

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
