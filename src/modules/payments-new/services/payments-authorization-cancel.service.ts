import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { IAuthorizationCancelPaymentContext } from "src/modules/payment-analysis/common/interfaces/authorization-cancel";
import { TPaymentItemAuthorizationCancelContext } from "src/modules/payment-analysis/common/types/authorization-cancel";
import { EPaymentCustomerType, EPaymentStatus } from "src/modules/payments-new/common/enums";
import {
  IPaymentExternalOperationResult,
  IPaymentOperationResult,
  IValidatePaymentItem,
} from "src/modules/payments-new/common/interfaces";
import { LokiLogger } from "src/common/logger";
import { UNDEFINED_VALUE } from "src/common/constants";
import { Company } from "src/modules/companies/entities";
import { TReturnCompanyDepositContext } from "src/modules/payments-new/common/types";
import { PaymentsExternalOperationsService, PaymentsManagementService } from "src/modules/payments-new/services";

@Injectable()
export class PaymentsAuthorizationCancelService {
  private readonly lokiLogger = new LokiLogger(PaymentsAuthorizationCancelService.name);
  constructor(
    private readonly paymentsManagementService: PaymentsManagementService,
    private readonly paymentsExternalOperationsService: PaymentsExternalOperationsService,
  ) {}

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
        `Failed to cancel authorization payment for appointmentId: ${appointment.id}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(`Failed to cancel authorization payment.`);
    }
  }

  public async cancelAuthorization(
    manager: EntityManager,
    context: IAuthorizationCancelPaymentContext,
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
      throw new InternalServerErrorException(`Failed to cancel authorization payment.`);
    }
  }

  private async cancelPaymentItem(
    manager: EntityManager,
    context: IAuthorizationCancelPaymentContext,
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

    const currentDeposit = Number(company.depositAmount ?? 0);
    const newDepositAmount = currentDeposit + Number(paymentItem.fullAmount);
    await manager.getRepository(Company).update({ id: company.id }, { depositAmount: newDepositAmount });

    return { status: EPaymentStatus.CANCELED };
  }
}
