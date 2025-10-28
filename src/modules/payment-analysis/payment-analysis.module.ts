import { Module } from "@nestjs/common";
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

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment, Company, Payment, IncomingPaymentWaitList]),
    PaymentsModule,
    QueueModule,
  ],
  providers: [
    PaymentAnalysisService,
    PaymentStrategyService,

    AuthorizationContextService,
    AuthorizationContextValidationService,
    AuthorizationContextQueryOptionsService,

    CaptureContextService,
    CaptureContextValidationService,
    CaptureContextQueryOptionsService,
  ],
  exports: [PaymentAnalysisService],
})
export class PaymentAnalysisModule {}
