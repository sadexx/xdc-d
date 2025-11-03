import { Injectable, InternalServerErrorException } from "@nestjs/common";
import {
  IMakeAuthorizationCancel,
  IMakeCaptureAndTransfer,
  IMakePreAuthorization,
  IMakeTransfer,
  IPaymentOperationResult,
} from "src/modules/payments-new/common/interfaces";
import { EPaymentAuthorizationStrategy } from "src/modules/payment-analysis/common/enums/authorization";
import {
  PaymentsAuthorizationCancelService,
  PaymentsAuthorizationService,
  PaymentsCaptureService,
  PaymentsCorporateDepositService,
  PaymentsCorporateSameCompanyCommissionService,
  PaymentsTransferService,
  PaymentsValidationFailedService,
  PaymentsWaitListService,
} from "src/modules/payments-new/services";
import { DataSource } from "typeorm";
import { AppointmentOrderSharedLogicService } from "src/modules/appointment-orders/shared/services";
import { EPaymentCaptureStrategy } from "src/modules/payment-analysis/common/enums/capture";
import { PaymentAnalysisService } from "src/modules/payment-analysis/services";
import { EPaymentOperation } from "src/modules/payment-analysis/common/enums";
import { QueueInitializeService } from "src/modules/queues/services";
import { TProcessSameCompanyCommissionContext } from "src/modules/payments-new/common/types";
import { EPaymentTransferStrategy } from "src/modules/payment-analysis/common/enums/transfer";
import { IGeneratePayOutReceipt, IGenerateTaxInvoiceReceipt } from "src/modules/pdf-new/common/interfaces";
import { EPaymentAuthorizationCancelStrategy } from "src/modules/payment-analysis/common/enums/authorization-cancel";
import { EPaymentCustomerType } from "src/modules/payments-new/common/enums";
import { LokiLogger } from "src/common/logger";

@Injectable()
export class PaymentsExecutionService {
  private readonly lokiLogger = new LokiLogger(PaymentsExecutionService.name);
  constructor(
    private readonly paymentsWaitListService: PaymentsWaitListService,
    private readonly paymentsAuthorizationService: PaymentsAuthorizationService,
    private readonly paymentsCorporateDepositService: PaymentsCorporateDepositService,
    private readonly paymentsAuthorizationCancelService: PaymentsAuthorizationCancelService,
    private readonly paymentsCaptureService: PaymentsCaptureService,
    private readonly paymentsCorporateSameCompanyCommissionService: PaymentsCorporateSameCompanyCommissionService,
    private readonly paymentsTransferService: PaymentsTransferService,
    private readonly paymentAnalysisService: PaymentAnalysisService,
    private readonly paymentsValidationFailedService: PaymentsValidationFailedService,
    private readonly appointmentOrderSharedLogicService: AppointmentOrderSharedLogicService,
    private readonly queueInitializeService: QueueInitializeService,
    private readonly dataSource: DataSource,
  ) {}

  public async makePreAuthorization(data: IMakePreAuthorization): Promise<void> {
    const { strategy, context, validationResult } = data;
    let operationResult: IPaymentOperationResult = { success: false };

    await this.dataSource.transaction(async (manager) => {
      switch (strategy) {
        case EPaymentAuthorizationStrategy.WAIT_LIST_REDIRECT:
          operationResult = await this.paymentsWaitListService.redirectPaymentToWaitList(manager, context, {
            isFirstAttemptFailed: false,
            isShortTimeSlot: false,
          });
          break;

        case EPaymentAuthorizationStrategy.INDIVIDUAL_STRIPE_AUTH:
          operationResult = await this.paymentsAuthorizationService.authorizePayment(manager, context, {
            isAdditionalTime: false,
            isShortTimeSlot: context.isShortTimeSlot,
          });
          break;

        case EPaymentAuthorizationStrategy.CORPORATE_DEPOSIT_CHARGE:
          operationResult = await this.paymentsCorporateDepositService.chargeFromDeposit(manager, context);
          break;

        case EPaymentAuthorizationStrategy.VALIDATION_FAILED:
          operationResult = await this.paymentsValidationFailedService.handlePaymentValidationFailure(
            manager,
            context,
            validationResult,
          );
          break;
      }
    });

    if (operationResult.success) {
      const { appointment } = context;
      await this.appointmentOrderSharedLogicService.triggerLaunchSearchForAppointment(appointment);
    } else {
      const { appointment } = context;
      this.lokiLogger.error(`Failed to make cancel authorization payment for appointmentId: ${appointment.id}`);
      throw new InternalServerErrorException(`Failed to make cancel authorization payment.`);
    }
  }

  public async makeAuthorizationCancel(data: IMakeAuthorizationCancel): Promise<void> {
    const { strategy, context, validationResult } = data;
    let operationResult: IPaymentOperationResult = { success: false };

    await this.dataSource.transaction(async (manager) => {
      switch (strategy) {
        case EPaymentAuthorizationCancelStrategy.INDIVIDUAL_AUTHORIZATION_CANCEL:
          operationResult = await this.paymentsAuthorizationCancelService.cancelAuthorization(
            manager,
            context,
            EPaymentCustomerType.INDIVIDUAL,
          );
          break;

        case EPaymentAuthorizationCancelStrategy.CORPORATE_AUTHORIZATION_CANCEL:
          operationResult = await this.paymentsAuthorizationCancelService.cancelAuthorization(
            manager,
            context,
            EPaymentCustomerType.CORPORATE,
          );
          break;

        case EPaymentAuthorizationCancelStrategy.AUTHORIZATION_CANCEL_NOT_ALLOWED:
          operationResult = await this.paymentsAuthorizationCancelService.handleLateClientCancellation(
            manager,
            context,
          );
          break;

        case EPaymentAuthorizationCancelStrategy.VALIDATION_FAILED:
          operationResult = await this.paymentsValidationFailedService.handlePaymentValidationFailure(
            manager,
            context,
            validationResult,
          );
          break;
      }
    });

    if (operationResult.success) {
      const { appointment } = context;
      switch (strategy) {
        case EPaymentAuthorizationCancelStrategy.AUTHORIZATION_CANCEL_NOT_ALLOWED:
          await this.paymentAnalysisService.analyzePaymentAction(appointment.id, EPaymentOperation.CAPTURE_PAYMENT);
          break;
      }
    } else {
      const { appointment } = context;
      this.lokiLogger.error(`Failed to make cancel authorization payment for appointmentId: ${appointment.id}`);
      throw new InternalServerErrorException(`Failed to make cancel authorization payment.`);
    }
  }

  public async makeCaptureAndTransfer(data: IMakeCaptureAndTransfer): Promise<void> {
    const { strategy, context, validationResult } = data;
    let operationResult: IPaymentOperationResult = { success: false };

    await this.dataSource.transaction(async (manager) => {
      switch (strategy) {
        case EPaymentCaptureStrategy.INDIVIDUAL_CAPTURE:
          operationResult = await this.paymentsCaptureService.capturePayment(
            manager,
            context,
            EPaymentCustomerType.INDIVIDUAL,
          );
          break;

        case EPaymentCaptureStrategy.CORPORATE_CAPTURE:
          operationResult = await this.paymentsCaptureService.capturePayment(
            manager,
            context,
            EPaymentCustomerType.INDIVIDUAL,
          );
          break;

        case EPaymentCaptureStrategy.SAME_COMPANY_COMMISSION:
          operationResult = await this.paymentsCorporateSameCompanyCommissionService.processSameCompanyCommission(
            manager,
            context as TProcessSameCompanyCommissionContext,
          );
          break;

        case EPaymentCaptureStrategy.VALIDATION_FAILED:
          await this.paymentsValidationFailedService.handlePaymentValidationFailure(manager, context, validationResult);
          break;
      }
    });

    if (operationResult.success) {
      const { payment, appointment, prices } = context;
      await this.queueInitializeService.addProcessPayInReceiptGenerationQueue({ payment, appointment, prices });
      await this.paymentAnalysisService.analyzePaymentAction(appointment.id, EPaymentOperation.TRANSFER_PAYMENT, {
        prices,
      });
    } else {
      const { appointment } = context;
      this.lokiLogger.error(`Failed to make capture and transfer payment for appointmentId: ${appointment.id}`);
      throw new InternalServerErrorException(`Failed to make capture and transfer payment.`);
    }
  }

  public async makeTransfer(data: IMakeTransfer): Promise<void> {
    const { strategy, context, validationResult } = data;
    let operationResult: IPaymentOperationResult = { success: false };

    await this.dataSource.transaction(async (manager) => {
      switch (strategy) {
        case EPaymentTransferStrategy.INDIVIDUAL_TRANSFER:
          operationResult = await this.paymentsTransferService.transferAndPayout(manager, context);
          break;

        case EPaymentTransferStrategy.CORPORATE_TRANSFER:
          operationResult = await this.paymentsTransferService.makeRecordToPayOutWaitList(manager, context);
          break;

        case EPaymentTransferStrategy.VALIDATION_FAILED:
          operationResult = await this.paymentsValidationFailedService.handlePaymentValidationFailure(
            manager,
            context,
            validationResult,
          );
          break;
      }
    });

    if (operationResult.success) {
      const { appointment, interpreter } = context;
      switch (strategy) {
        case EPaymentTransferStrategy.INDIVIDUAL_TRANSFER:
          await this.queueInitializeService.addProcessPayOutReceiptGenerationQueue({
            paymentRecordResult: operationResult.paymentRecordResult,
            appointment,
            interpreter,
          } as IGeneratePayOutReceipt);
          await this.queueInitializeService.addProcessTaxInvoiceReceiptGenerationQueue({
            paymentRecordResult: operationResult.paymentRecordResult,
            appointment,
            interpreter,
          } as IGenerateTaxInvoiceReceipt);
          break;
      }
    } else {
      const { appointment } = context;
      this.lokiLogger.error(`Failed to make transfer payment for appointmentId: ${appointment.id}`);
      throw new InternalServerErrorException(`Failed to make transfer payment.`);
    }
  }
}
