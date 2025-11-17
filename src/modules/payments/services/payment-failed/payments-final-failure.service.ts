import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { EPaymentStatus } from "src/modules/payments/common/enums/core";
import { EPaymentAuthorizationStrategy } from "src/modules/payments-analysis/common/enums/authorization";
import {
  TCreateAuthorizationPaymentRecord,
  TCreateDepositChargePaymentRecord,
} from "src/modules/payments/common/types/authorization";
import { AppointmentFailedPaymentCancelService } from "src/modules/appointments/failed-payment-cancel/services";
import {
  PaymentsAuthorizationService,
  PaymentsCorporateDepositService,
  PaymentsManagementService,
  PaymentsTransferService,
} from "src/modules/payments/services";
import {
  IMakePreAuthorization,
  IMakeCaptureAndTransfer,
  IMakeTransfer,
} from "src/modules/payments/common/interfaces/core";

@Injectable()
export class PaymentsFinalFailureService {
  constructor(
    private readonly paymentsManagementService: PaymentsManagementService,
    private readonly paymentsAuthorizationService: PaymentsAuthorizationService,
    private readonly paymentsCorporateDepositService: PaymentsCorporateDepositService,
    private readonly paymentsTransferService: PaymentsTransferService,
    private readonly appointmentFailedPaymentCancelService: AppointmentFailedPaymentCancelService,
    private readonly dataSource: DataSource,
  ) {}

  public async handleMakePreAuthorizationFailure(data: IMakePreAuthorization): Promise<void> {
    const { strategy, context } = data;
    await this.dataSource.transaction(async (manager) => {
      switch (strategy) {
        case EPaymentAuthorizationStrategy.INDIVIDUAL_STRIPE_AUTH: {
          await this.paymentsAuthorizationService.createAuthorizationPaymentRecord(
            manager,
            context as TCreateAuthorizationPaymentRecord,
            { status: EPaymentStatus.AUTHORIZATION_FAILED },
          );
          await this.paymentsAuthorizationService.handleGroupAppointmentAuthFailure(manager, context);
          break;
        }
        case EPaymentAuthorizationStrategy.CORPORATE_DEPOSIT_CHARGE: {
          await this.paymentsCorporateDepositService.createDepositChargePaymentRecord(
            manager,
            context as TCreateDepositChargePaymentRecord,
            EPaymentStatus.AUTHORIZATION_FAILED,
          );
          break;
        }
      }
      await this.appointmentFailedPaymentCancelService.cancelAppointmentPaymentFailed(manager, context.appointment.id);
    });
  }

  public async handleMakeCaptureAndTransferFailure(data: IMakeCaptureAndTransfer): Promise<void> {
    const { context } = data;
    await this.dataSource.transaction(async (manager) => {
      await this.paymentsManagementService.updatePaymentItem(
        manager,
        { payment: { id: context.payment.id } },
        { status: EPaymentStatus.CAPTURE_FAILED },
      );
    });
  }

  public async handleMakeTransferFailure(data: IMakeTransfer): Promise<void> {
    const { context } = data;
    await this.dataSource.transaction(async (manager) => {
      await this.paymentsTransferService.createTransferPaymentRecord(manager, context, {
        status: EPaymentStatus.TRANSFER_FAILED,
      });
    });
  }
}
