import { Injectable } from "@nestjs/common";
import {
  ICreatePaymentRecord,
  IPaymentOperationResult,
  IPaymentValidationResult,
} from "src/modules/payments-new/common/interfaces";
import { PaymentsCreationService, PaymentsNotificationService } from "src/modules/payments-new/services";
import {
  EPaymentCustomerType,
  EPaymentDirection,
  EPaymentFailedReason,
  EPaymentStatus,
  EPaymentSystem,
} from "src/modules/payments-new/common/enums";
import { AppointmentFailedPaymentCancelTempService } from "src/modules/appointments/failed-payment-cancel/services";
import { IAuthorizationPaymentContext } from "src/modules/payment-analysis/common/interfaces/authorization";
import { EntityManager } from "typeorm";
import { TPaymentContext } from "src/modules/payment-analysis/common/types";
import { UNDEFINED_VALUE } from "src/common/constants";
import { EPaymentOperation } from "src/modules/payment-analysis/common/enums";

@Injectable()
export class PaymentsValidationFailedService {
  constructor(
    private readonly paymentsCreationService: PaymentsCreationService,
    private readonly paymentsNotificationService: PaymentsNotificationService,
    private readonly appointmentFailedPaymentCancelService: AppointmentFailedPaymentCancelTempService,
  ) {}

  public async handlePaymentValidationFailure(
    manager: EntityManager,
    context: TPaymentContext,
    validationResult: IPaymentValidationResult,
  ): Promise<IPaymentOperationResult> {
    const paymentRecordDto = this.buildPaymentRecordDto(context, validationResult);

    await this.paymentsCreationService.createPaymentRecord(manager, paymentRecordDto);

    await this.appointmentFailedPaymentCancelService.cancelAppointmentPaymentFailed(manager, context.appointment.id);

    await this.sendFailureNotification(context);

    return { success: false };
  }

  private buildPaymentRecordDto(
    context: TPaymentContext,
    validationResult: IPaymentValidationResult,
  ): ICreatePaymentRecord {
    switch (context.operation) {
      case EPaymentOperation.AUTHORIZE_PAYMENT:
        return this.buildPaymentAuthorizationDto(context, validationResult);
      default:
        throw new Error(`Unsupported payment operation: ${context.operation}`);
    }
  }

  private buildPaymentAuthorizationDto(
    context: IAuthorizationPaymentContext,
    validationResult: IPaymentValidationResult,
  ): ICreatePaymentRecord {
    const { isClientCorporate, currency, prices } = context;

    const determinedCustomerType = isClientCorporate ? EPaymentCustomerType.CORPORATE : EPaymentCustomerType.INDIVIDUAL;
    const determinedSystem = isClientCorporate ? EPaymentSystem.DEPOSIT : EPaymentSystem.STRIPE;

    return {
      currency,
      direction: EPaymentDirection.INCOMING,
      status: EPaymentStatus.AUTHORIZATION_FAILED,
      system: determinedSystem,
      appointment: context.appointment,
      customerType: determinedCustomerType,
      fromClient: context.appointment.client,
      company: context.companyContext?.company,
      prices: prices ?? UNDEFINED_VALUE,
      paymentMethodInfo: "Payment not configured.",
      note: this.formatValidationErrors(validationResult.errors),
    };
  }

  private async sendFailureNotification(context: TPaymentContext): Promise<void> {
    switch (context.operation) {
      case EPaymentOperation.AUTHORIZE_PAYMENT:
        return await this.paymentsNotificationService.sendAuthorizationPaymentFailedNotification(
          context.appointment,
          EPaymentFailedReason.PAYMENT_OPERATION_FAILED,
        );
    }
  }

  private formatValidationErrors(errors: string[]): string {
    return `Validation failed (${errors.length} errors): ${errors.join("; ")}`;
  }
}
