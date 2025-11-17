import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { IAuthorizationCancelPaymentContext } from "src/modules/payments-analysis/common/interfaces/authorization-cancel";
import { TPaymentItemAuthorizationCancelContext } from "src/modules/payments-analysis/common/types/authorization-cancel";
import { EPaymentCustomerType, EPaymentsErrorCodes, EPaymentStatus } from "src/modules/payments/common/enums/core";
import { LokiLogger } from "src/common/logger";
import { UNDEFINED_VALUE } from "src/common/constants";
import { Company } from "src/modules/companies/entities";
import { TReturnCompanyDepositContext } from "src/modules/payments/common/types/authorization";
import { PaymentsExternalOperationsService, PaymentsManagementService } from "src/modules/payments/services";
import { formatDecimalString } from "src/common/utils";
import { ICancelAuthorizationContext } from "src/modules/payments/common/interfaces/authorization";
import { IPaymentOperationResult, IValidatePaymentItem } from "src/modules/payments/common/interfaces/core";
import { IPaymentExternalOperationResult } from "src/modules/payments/common/interfaces/management";

@Injectable()
export class PaymentsAuthorizationCancelService {
  private readonly lokiLogger = new LokiLogger(PaymentsAuthorizationCancelService.name);
  constructor(
    private readonly paymentsManagementService: PaymentsManagementService,
    private readonly paymentsExternalOperationsService: PaymentsExternalOperationsService,
  ) {}

  /**
   * Handles late client cancellation by updating payment note instead of refunding.
   *
   * When a client cancels less than 12 hours before appointment start, the authorization
   * is kept and will be captured instead of cancelled. This prevents refund for late cancellations.
   *
   * @param manager - Entity manager for transaction
   * @param context - Authorization cancel context with appointment and payment data
   * @returns Success result indicating the operation completed
   * @throws {InternalServerErrorException} If updating payment note fails
   */
  public async handleLateClientCancellation(
    manager: EntityManager,
    context: IAuthorizationCancelPaymentContext,
  ): Promise<IPaymentOperationResult> {
    const { appointment, payment } = context;
    try {
      await this.paymentsManagementService.updatePayment(
        manager,
        { id: payment.id },
        { note: "Appointment cancelled by client less than 12 hours to appointment start date." },
      );

      return { success: true };
    } catch (error) {
      this.lokiLogger.error(
        `Failed to handle late cancellation payment for appointmentId: ${appointment.id}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(EPaymentsErrorCodes.HANDLE_LATE_CANCELLATION_FAILED);
    }
  }

  /**
   * Cancels payment authorization for individual or corporate clients.
   *
   * Iterates through all payment items and cancels each one via Stripe or deposit reversal.
   * Returns success only if all items are successfully cancelled.
   *
   * @param manager - Entity manager for transaction
   * @param context - Cancellation context with payment and appointment data
   * @param customerType - Type of customer (individual or corporate)
   * @returns Success result indicating if all items were cancelled
   * @throws {InternalServerErrorException} If cancellation process fails
   */
  public async cancelAuthorization(
    manager: EntityManager,
    context: ICancelAuthorizationContext,
    customerType: EPaymentCustomerType,
  ): Promise<IPaymentOperationResult> {
    const { payment, appointment } = context;
    try {
      let failedCount = 0;
      for (const paymentItem of payment.items) {
        const result = await this.cancelPaymentItem(manager, context, paymentItem, customerType);

        if (result.status !== EPaymentStatus.CANCELED) {
          failedCount++;
        }
      }

      return { success: failedCount === 0 };
    } catch (error) {
      this.lokiLogger.error(
        `Failed to cancel authorization payment for appointmentId: ${appointment.id}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(EPaymentsErrorCodes.CANCEL_AUTHORIZATION_FAILED);
    }
  }

  private async cancelPaymentItem(
    manager: EntityManager,
    context: ICancelAuthorizationContext,
    paymentItem: TPaymentItemAuthorizationCancelContext,
    customerType: EPaymentCustomerType,
  ): Promise<IPaymentExternalOperationResult> {
    if (paymentItem.status === EPaymentStatus.CANCELED) {
      return { status: EPaymentStatus.CANCELED };
    }

    const validationResult = this.validateItemForCancel(paymentItem, customerType);
    let result: IPaymentExternalOperationResult = {
      status: EPaymentStatus.CANCEL_FAILED,
      error: validationResult.reason,
    } as IPaymentExternalOperationResult;

    if (validationResult.valid) {
      if (customerType === EPaymentCustomerType.CORPORATE) {
        result = await this.returnCompanyDeposit(manager, context as TReturnCompanyDepositContext, paymentItem);
      } else {
        result = await this.paymentsExternalOperationsService.attemptStripeAuthorizationCancel(context, paymentItem);
      }
    }

    const note = result.error ? result.error : UNDEFINED_VALUE;
    await this.paymentsManagementService.updatePaymentItem(
      manager,
      { id: paymentItem.id },
      { status: result.status, note },
    );

    return result;
  }

  private validateItemForCancel(
    paymentItem: TPaymentItemAuthorizationCancelContext,
    customerType: EPaymentCustomerType,
  ): IValidatePaymentItem {
    if (paymentItem.status !== EPaymentStatus.AUTHORIZED) {
      return { valid: false, reason: `Incorrect payment status. Previous status: ${paymentItem.status}` };
    }

    if (customerType === EPaymentCustomerType.INDIVIDUAL && !paymentItem.externalId && paymentItem.fullAmount > 0) {
      return { valid: false, reason: "Payment externalId not filled." };
    }

    return { valid: true };
  }

  private async returnCompanyDeposit(
    manager: EntityManager,
    context: TReturnCompanyDepositContext,
    paymentItem: TPaymentItemAuthorizationCancelContext,
  ): Promise<IPaymentExternalOperationResult> {
    const { company } = context;

    if (paymentItem.fullAmount <= 0) {
      return { status: EPaymentStatus.CANCELED };
    }

    const currentDeposit = company.depositAmount ?? 0;
    const newDepositAmount = currentDeposit + paymentItem.fullAmount;
    await manager
      .getRepository(Company)
      .update({ id: company.id }, { depositAmount: formatDecimalString(newDepositAmount) });

    return { status: EPaymentStatus.CANCELED };
  }
}
