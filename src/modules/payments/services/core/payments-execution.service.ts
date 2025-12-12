import { Injectable } from "@nestjs/common";
import { EPaymentAuthorizationStrategy } from "src/modules/payments-analysis/common/enums/authorization";
import { DataSource, EntityManager } from "typeorm";
import { AppointmentOrderSharedLogicService } from "src/modules/appointment-orders/shared/services";
import { EPaymentCaptureStrategy } from "src/modules/payments-analysis/common/enums/capture";
import { EPaymentOperation } from "src/modules/payments-analysis/common/enums/core";
import { QueueInitializeService } from "src/modules/queues/services";
import { EPaymentTransferStrategy } from "src/modules/payments-analysis/common/enums/transfer";
import { IGeneratePayOutReceipt, IGenerateTaxInvoiceReceipt } from "src/modules/pdf/common/interfaces";
import { EPaymentAuthorizationCancelStrategy } from "src/modules/payments-analysis/common/enums/authorization-cancel";
import { EPaymentCustomerType } from "src/modules/payments/common/enums/core";
import { LokiLogger } from "src/common/logger";
import { EPaymentAuthorizationRecreateStrategy } from "src/modules/payments-analysis/common/enums/authorization-recreate";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { AppointmentSharedService } from "src/modules/appointments/shared/services";
import { IAuthorizationPaymentContext } from "src/modules/payments-analysis/common/interfaces/authorization";
import { ICapturePaymentContext } from "src/modules/payments-analysis/common/interfaces/capture";
import { IAuthorizationCancelPaymentContext } from "src/modules/payments-analysis/common/interfaces/authorization-cancel";
import { IAuthorizationRecreatePaymentContext } from "src/modules/payments-analysis/common/interfaces/authorization-recreate";
import {
  PaymentsAuthorizationCancelService,
  PaymentsAuthorizationService,
  PaymentsCaptureService,
  PaymentsCorporateDepositService,
  PaymentsCorporatePostPaymentService,
  PaymentsCorporateSameCompanyCommissionService,
  PaymentsManagementService,
  PaymentsTransferService,
  PaymentsValidationFailedService,
  PaymentsWaitListService,
} from "src/modules/payments/services";
import {
  IMakePreAuthorization,
  IPaymentOperationResult,
  IMakePreAuthorizationRecreate,
  IMakeAuthorizationCancel,
  IMakeCaptureAndTransfer,
  IMakeTransfer,
} from "src/modules/payments/common/interfaces/core";
import { ICreatePaymentRecordResult } from "src/modules/payments/common/interfaces/management";
import { TProcessSameCompanyCommissionContext } from "src/modules/payments/common/types/capture";
import {
  TAuthorizeCorporatePostPaymentContext,
  TAuthorizePaymentContext,
  TChargeFromDepositContext,
} from "src/modules/payments/common/types/authorization";
import { TMakeRecordToPayOutWaitListContext } from "src/modules/payments/common/types/transfer";

@Injectable()
export class PaymentsExecutionService {
  private readonly lokiLogger = new LokiLogger(PaymentsExecutionService.name);
  constructor(
    private readonly paymentsManagementService: PaymentsManagementService,
    private readonly paymentsWaitListService: PaymentsWaitListService,
    private readonly paymentsAuthorizationService: PaymentsAuthorizationService,
    private readonly paymentsCorporateDepositService: PaymentsCorporateDepositService,
    private readonly paymentCorporatePostPaymentService: PaymentsCorporatePostPaymentService,
    private readonly paymentsAuthorizationCancelService: PaymentsAuthorizationCancelService,
    private readonly paymentsCaptureService: PaymentsCaptureService,
    private readonly paymentsCorporateSameCompanyCommissionService: PaymentsCorporateSameCompanyCommissionService,
    private readonly paymentsTransferService: PaymentsTransferService,
    private readonly paymentsValidationFailedService: PaymentsValidationFailedService,
    private readonly appointmentOrderSharedLogicService: AppointmentOrderSharedLogicService,
    private readonly appointmentSharedService: AppointmentSharedService,
    private readonly queueInitializeService: QueueInitializeService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Performs pre-authorization for a payment based on the specified strategy within a database transaction.
   * On success, triggers appointment-related operations (e.g., launch search or extend end time).
   * Handles failures by logging and propagating the error for queue retry.
   *
   * @param data - The pre-authorization input containing strategy, context, and validation result.
   * @returns Promise<void> - Resolves on success; rejects on failure.
   * @throws {InternalServerErrorException} - If authorization or post-processing fails.
   */
  public async makePreAuthorization(data: IMakePreAuthorization): Promise<void> {
    const { strategy, context, validationResult } = data;
    let operationResult: IPaymentOperationResult = { success: false };

    try {
      await this.dataSource.transaction(async (manager) => {
        switch (strategy) {
          case EPaymentAuthorizationStrategy.WAIT_LIST_REDIRECT: {
            operationResult = await this.paymentsWaitListService.redirectPaymentToWaitList(manager, context, {
              isFirstAttemptFailed: false,
              isShortTimeSlot: false,
            });
            break;
          }
          case EPaymentAuthorizationStrategy.INDIVIDUAL_STRIPE_AUTH: {
            operationResult = await this.paymentsAuthorizationService.authorizePayment(
              manager,
              context as TAuthorizePaymentContext,
            );
            break;
          }
          case EPaymentAuthorizationStrategy.CORPORATE_DEPOSIT_CHARGE: {
            operationResult = await this.paymentsCorporateDepositService.chargeFromDeposit(
              manager,
              context as TChargeFromDepositContext,
            );
            break;
          }
          case EPaymentAuthorizationStrategy.CORPORATE_POST_PAYMENT: {
            operationResult = await this.paymentCorporatePostPaymentService.authorizeCorporatePostPayment(
              manager,
              context as TAuthorizeCorporatePostPaymentContext,
            );
            break;
          }
          case EPaymentAuthorizationStrategy.VALIDATION_FAILED: {
            operationResult = await this.paymentsValidationFailedService.handlePaymentValidationFailure(
              manager,
              context,
              validationResult,
            );
            break;
          }
        }

        if (operationResult.success) {
          await this.processPreAuthorizationSuccess(manager, context);
        }
      });
    } catch (error) {
      const { appointment } = context;
      this.lokiLogger.error(
        `Failed to make payment pre authorization for appointmentId: ${appointment.id} (${strategy})`,
      );
      throw error;
    }
  }

  private async processPreAuthorizationSuccess(
    manager: EntityManager,
    context: IAuthorizationPaymentContext,
  ): Promise<void> {
    const { appointment } = context;
    switch (context.operation) {
      case EPaymentOperation.AUTHORIZE_PAYMENT:
        return await this.appointmentOrderSharedLogicService.triggerLaunchSearchForAppointment(manager, appointment);
      case EPaymentOperation.AUTHORIZE_ADDITIONAL_BLOCK_PAYMENT:
        return await this.appointmentSharedService.extendBusinessEndTime(manager, context);
    }
  }

  /**
   * Recreates pre-authorization for a payment based on the specified strategy within a database transaction.
   * On success, triggers post-recreation operations.
   * Handles failures by logging and propagating the error for queue retry.
   *
   * @param data - The recreation input containing strategy and context.
   * @returns Promise<void> - Resolves on success; rejects on failure.
   * @throws InternalServerErrorException - If recreation or post-processing fails.
   */
  public async makePreAuthorizationRecreate(data: IMakePreAuthorizationRecreate): Promise<void> {
    const { strategy, context } = data;
    let operationResult: IPaymentOperationResult = { success: false };

    try {
      await this.dataSource.transaction(async (manager) => {
        switch (strategy) {
          case EPaymentAuthorizationRecreateStrategy.INDIVIDUAL_CANCEL_AND_REAUTHORIZE: {
            operationResult = await this.paymentsAuthorizationCancelService.cancelAuthorization(
              manager,
              context,
              EPaymentCustomerType.INDIVIDUAL,
            );
            break;
          }
          case EPaymentAuthorizationRecreateStrategy.CORPORATE_CANCEL_AND_REAUTHORIZE: {
            operationResult = await this.paymentsAuthorizationCancelService.cancelAuthorization(
              manager,
              context,
              EPaymentCustomerType.CORPORATE,
            );
            break;
          }
          case EPaymentAuthorizationRecreateStrategy.REATTACH_EXISTING_PAYMENT: {
            const { payment, appointment } = context;
            await this.paymentsManagementService.updatePayment(
              manager,
              { id: payment.id },
              { appointment: appointment as Appointment },
            );
            await this.appointmentOrderSharedLogicService.triggerLaunchSearchForAppointment(manager, appointment);
            break;
          }
        }
      });

      if (operationResult.success) {
        await this.processPreAuthorizationRecreateSuccess(context);
      }
    } catch (error) {
      const { appointment } = context;
      this.lokiLogger.error(
        `Failed to make payment pre authorization recreate for appointmentId: ${appointment.id} (${strategy})`,
      );
      throw error;
    }
  }

  private async processPreAuthorizationRecreateSuccess(context: IAuthorizationRecreatePaymentContext): Promise<void> {
    const { appointment, prices } = context;
    await this.queueInitializeService.addProcessPaymentOperationQueue(
      appointment.id,
      EPaymentOperation.AUTHORIZE_PAYMENT,
      { isShortTimeSlot: false, prices },
    );
  }

  /**
   * Performs pre-authorization cancellation based on the specified strategy within a database transaction.
   * On success, triggers post-cancellation operations.
   * Handles failures by logging and propagating the error for queue retry.
   *
   * @param data - The cancellation input containing strategy, context, and validation result.
   * @returns Promise<void> - Resolves on success; rejects on failure.
   * @throws {InternalServerErrorException} - If cancellation or post-processing fails.
   */
  public async makePreAuthorizationCancel(data: IMakeAuthorizationCancel): Promise<void> {
    const { strategy, context, validationResult } = data;
    let operationResult: IPaymentOperationResult = { success: false };

    try {
      await this.dataSource.transaction(async (manager) => {
        switch (strategy) {
          case EPaymentAuthorizationCancelStrategy.INDIVIDUAL_AUTHORIZATION_CANCEL: {
            operationResult = await this.paymentsAuthorizationCancelService.cancelAuthorization(
              manager,
              context,
              EPaymentCustomerType.INDIVIDUAL,
            );
            break;
          }
          case EPaymentAuthorizationCancelStrategy.CORPORATE_AUTHORIZATION_CANCEL: {
            operationResult = await this.paymentsAuthorizationCancelService.cancelAuthorization(
              manager,
              context,
              EPaymentCustomerType.CORPORATE,
            );
            break;
          }
          case EPaymentAuthorizationCancelStrategy.AUTHORIZATION_CANCEL_NOT_ALLOWED: {
            operationResult = await this.paymentsAuthorizationCancelService.handleLateClientCancellation(
              manager,
              context,
            );
            break;
          }
          case EPaymentAuthorizationCancelStrategy.VALIDATION_FAILED: {
            operationResult = await this.paymentsValidationFailedService.handlePaymentValidationFailure(
              manager,
              context,
              validationResult,
            );
            break;
          }
        }
      });

      if (operationResult.success) {
        await this.processPreAuthorizationCancelSuccess(context, strategy);
      }
    } catch (error) {
      const { appointment } = context;
      this.lokiLogger.error(
        `Failed to make payment cancel authorization for appointmentId: ${appointment.id} (${strategy})`,
      );
      throw error;
    }
  }

  private async processPreAuthorizationCancelSuccess(
    context: IAuthorizationCancelPaymentContext,
    strategy: EPaymentAuthorizationCancelStrategy,
  ): Promise<void> {
    const { appointment } = context;
    switch (strategy) {
      case EPaymentAuthorizationCancelStrategy.AUTHORIZATION_CANCEL_NOT_ALLOWED:
        await this.queueInitializeService.addProcessPaymentOperationQueue(
          appointment.id,
          EPaymentOperation.CAPTURE_PAYMENT,
          { isSecondAttempt: false },
        );
    }
  }

  /**
   * Performs payment capture and transfer based on the specified strategy within a database transaction.
   * On success, triggers post-capture operations (e.g., transfer funds).
   * Handles failures by logging and propagating the error for queue retry.
   *
   * @param data - The capture and transfer input containing strategy, context, and validation result.
   * @returns Promise<void> - Resolves on success; rejects on failure.
   * @throws {InternalServerErrorException} - If capture, transfer, or post-processing fails.
   */
  public async makeCaptureAndTransfer(data: IMakeCaptureAndTransfer): Promise<void> {
    const { strategy, context, validationResult } = data;
    let operationResult: IPaymentOperationResult = { success: false };

    try {
      await this.dataSource.transaction(async (manager) => {
        switch (strategy) {
          case EPaymentCaptureStrategy.INDIVIDUAL_CAPTURE: {
            operationResult = await this.paymentsCaptureService.capturePayment(
              manager,
              context,
              EPaymentCustomerType.INDIVIDUAL,
            );
            break;
          }
          case EPaymentCaptureStrategy.CORPORATE_CAPTURE: {
            operationResult = await this.paymentsCaptureService.capturePayment(
              manager,
              context,
              EPaymentCustomerType.CORPORATE,
            );
            break;
          }
          case EPaymentCaptureStrategy.SAME_COMPANY_COMMISSION: {
            operationResult = await this.paymentsCorporateSameCompanyCommissionService.processSameCompanyCommission(
              manager,
              context as TProcessSameCompanyCommissionContext,
            );
            break;
          }
          case EPaymentCaptureStrategy.VALIDATION_FAILED: {
            await this.paymentsValidationFailedService.handlePaymentValidationFailure(
              manager,
              context,
              validationResult,
            );
            break;
          }
        }
      });

      if (operationResult.success) {
        await this.processCaptureAndTransferSuccess(context);
      }
    } catch (error) {
      const { appointment } = context;
      this.lokiLogger.error(
        `Failed to make payment capture and transfer for appointmentId: ${appointment.id} (${strategy})`,
      );
      throw error;
    }
  }

  private async processCaptureAndTransferSuccess(context: ICapturePaymentContext): Promise<void> {
    const { payment, appointment, prices, isSecondAttempt } = context;
    await this.queueInitializeService.addProcessPayInReceiptGenerationQueue({ payment, appointment, prices });
    await this.queueInitializeService.addProcessPaymentOperationQueue(
      appointment.id,
      EPaymentOperation.TRANSFER_PAYMENT,
      { prices, isSecondAttempt },
    );
  }

  /**
   * Performs payment transfer based on the specified strategy within a database transaction.
   * On success, triggers post-transfer operations (e.g., process payout result).
   * Handles failures by logging and propagating the error for queue retry.
   *
   * @param data - The transfer input containing strategy, context, and validation result.
   * @returns Promise<void> - Resolves on success; rejects on failure.
   * @throws InternalServerErrorException - If transfer or post-processing fails.
   */
  public async makeTransfer(data: IMakeTransfer): Promise<void> {
    const { strategy, context, validationResult } = data;
    let operationResult: IPaymentOperationResult = { success: false };

    try {
      await this.dataSource.transaction(async (manager) => {
        switch (strategy) {
          case EPaymentTransferStrategy.INDIVIDUAL_TRANSFER: {
            operationResult = await this.paymentsTransferService.transferAndPayout(manager, context);
            break;
          }
          case EPaymentTransferStrategy.CORPORATE_TRANSFER: {
            operationResult = await this.paymentsTransferService.makeRecordToPayOutWaitList(
              manager,
              context as TMakeRecordToPayOutWaitListContext,
            );
            break;
          }
          case EPaymentTransferStrategy.VALIDATION_FAILED: {
            operationResult = await this.paymentsValidationFailedService.handlePaymentValidationFailure(
              manager,
              context,
              validationResult,
            );
            break;
          }
        }
      });

      if (operationResult.success) {
        await this.processTransferSuccess(data, operationResult.paymentRecordResult);
      }
    } catch (error) {
      const { appointment } = context;
      this.lokiLogger.error(`Failed to make payment transfer for appointmentId: ${appointment.id} (${strategy})`);
      throw error;
    }
  }

  private async processTransferSuccess(
    data: IMakeTransfer,
    paymentRecordResult?: ICreatePaymentRecordResult,
  ): Promise<void> {
    const { strategy, context } = data;
    const { appointment, interpreter } = context;
    switch (strategy) {
      case EPaymentTransferStrategy.INDIVIDUAL_TRANSFER: {
        await this.queueInitializeService.addProcessPayOutReceiptGenerationQueue({
          paymentRecordResult,
          appointment,
          interpreter,
        } as IGeneratePayOutReceipt);
        await this.queueInitializeService.addProcessTaxInvoiceReceiptGenerationQueue({
          paymentRecordResult,
          appointment,
          interpreter,
        } as IGenerateTaxInvoiceReceipt);
        break;
      }
    }
  }
}
