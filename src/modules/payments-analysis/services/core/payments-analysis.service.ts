import { BadRequestException, Injectable } from "@nestjs/common";
import {
  AuthorizationContextService,
  AuthorizationContextValidationService,
} from "src/modules/payments-analysis/services/authorization";
import { TPaymentContext } from "src/modules/payments-analysis/common/types/core";
import { QueueInitializeService } from "src/modules/queues/services";
import { PaymentStrategyService } from "src/modules/payments-analysis/services/core";
import { CaptureContextService, CaptureContextValidationService } from "src/modules/payments-analysis/services/capture";
import {
  IPaymentAnalysisAdditionalData,
  TProcessPaymentOperationData,
} from "src/modules/payments-analysis/common/interfaces/core";
import {
  TransferContextService,
  TransferContextValidationService,
} from "src/modules/payments-analysis/services/transfer";
import { EPaymentOperation, EPaymentsAnalysisErrorCodes } from "src/modules/payments-analysis/common/enums/core";
import {
  AuthorizationCancelContextService,
  AuthorizationCancelContextValidationService,
} from "src/modules/payments-analysis/services/authorization-cancel";
import { AuthorizationRecreateContextService } from "src/modules/payments-analysis/services/authorization-recreate";
import { UNDEFINED_VALUE } from "src/common/constants";
import { IPaymentValidationResult } from "src/modules/payments/common/interfaces/payment-failed";

@Injectable()
export class PaymentAnalysisService {
  constructor(
    private readonly authorizationContextService: AuthorizationContextService,
    private readonly authorizationContextValidationService: AuthorizationContextValidationService,
    private readonly authorizationRecreateContextService: AuthorizationRecreateContextService,
    private readonly authorizationCancelContextService: AuthorizationCancelContextService,
    private readonly authorizationCancelContextValidationService: AuthorizationCancelContextValidationService,
    private readonly captureContextService: CaptureContextService,
    private readonly captureContextValidationService: CaptureContextValidationService,
    private readonly transferContextService: TransferContextService,
    private readonly transferContextValidationService: TransferContextValidationService,
    private readonly paymentStrategyService: PaymentStrategyService,
    private readonly queueInitializeService: QueueInitializeService,
  ) {}

  /**
   * Analyzes a payment action and queues it for processing.
   *
   * Orchestrates the complete payment analysis workflow:
   * 1. Loads payment context with all required data
   * 2. Validates the context for eligibility
   * 3. Determines the appropriate processing strategy
   * 4. Queues the operation for asynchronous execution
   *
   * @param appointmentId - The appointment ID to process payment for
   * @param operation - The type of payment operation to perform
   * @param additionalData - Optional additional data required for specific operations
   * @returns Promise that resolves when the operation is queued
   */
  public async analyzePaymentAction(
    appointmentId: string,
    operation: EPaymentOperation,
    additionalData: IPaymentAnalysisAdditionalData,
  ): Promise<void> {
    const context = await this.loadPaymentContext(appointmentId, operation, additionalData);

    if (!context) {
      return;
    }

    const validationResult = this.validatePaymentEligibility(context);

    const strategy = this.paymentStrategyService.determinePaymentStrategy(context, validationResult);

    await this.addProcessPaymentOperationQueue({
      operation,
      strategy,
      context,
      validationResult,
    } as TProcessPaymentOperationData);
  }

  private async loadPaymentContext(
    appointmentId: string,
    operation: EPaymentOperation,
    additionalData: IPaymentAnalysisAdditionalData,
  ): Promise<TPaymentContext | null> {
    switch (operation) {
      case EPaymentOperation.AUTHORIZE_PAYMENT: {
        if (additionalData.isShortTimeSlot === UNDEFINED_VALUE) {
          throw new BadRequestException({
            message: EPaymentsAnalysisErrorCodes.ADDITIONAL_DATA_REQUIRED,
            variables: { operation },
          });
        }

        const { isShortTimeSlot, additionalBlockDuration, prices } = additionalData;

        return await this.authorizationContextService.loadPaymentContextForAuthorization(appointmentId, {
          isShortTimeSlot,
          additionalBlockDuration,
          initialPrices: prices,
        });
      }
      case EPaymentOperation.AUTHORIZE_ADDITIONAL_BLOCK_PAYMENT: {
        if (
          additionalData.isShortTimeSlot === UNDEFINED_VALUE ||
          additionalData.additionalBlockDuration === UNDEFINED_VALUE
        ) {
          throw new BadRequestException({
            message: EPaymentsAnalysisErrorCodes.ADDITIONAL_DATA_REQUIRED,
            variables: { operation },
          });
        }

        const { isShortTimeSlot, additionalBlockDuration } = additionalData;

        return await this.authorizationContextService.loadPaymentContextForAuthorization(appointmentId, {
          isShortTimeSlot,
          additionalBlockDuration,
        });
      }
      case EPaymentOperation.AUTHORIZATION_RECREATE_PAYMENT: {
        if (additionalData.oldAppointmentId === UNDEFINED_VALUE) {
          throw new BadRequestException({
            message: EPaymentsAnalysisErrorCodes.ADDITIONAL_DATA_REQUIRED,
            variables: { operation },
          });
        }

        return await this.authorizationRecreateContextService.loadPaymentContextForAuthorizationRecreate(
          appointmentId,
          additionalData.oldAppointmentId,
        );
      }
      case EPaymentOperation.AUTHORIZATION_CANCEL_PAYMENT: {
        if (additionalData.isCancelledByClient === UNDEFINED_VALUE) {
          throw new BadRequestException({
            message: EPaymentsAnalysisErrorCodes.ADDITIONAL_DATA_REQUIRED,
            variables: { operation },
          });
        }

        return await this.authorizationCancelContextService.loadPaymentContextForAuthorizationCancel(
          appointmentId,
          additionalData.isCancelledByClient,
        );
      }
      case EPaymentOperation.CAPTURE_PAYMENT: {
        if (additionalData.isSecondAttempt === UNDEFINED_VALUE) {
          throw new BadRequestException({
            message: EPaymentsAnalysisErrorCodes.ADDITIONAL_DATA_REQUIRED,
            variables: { operation },
          });
        }

        return await this.captureContextService.loadPaymentContextForCapture(
          appointmentId,
          additionalData.isSecondAttempt,
        );
      }
      case EPaymentOperation.TRANSFER_PAYMENT: {
        if (additionalData.prices === UNDEFINED_VALUE || additionalData.isSecondAttempt === UNDEFINED_VALUE) {
          throw new BadRequestException({
            message: EPaymentsAnalysisErrorCodes.ADDITIONAL_DATA_REQUIRED,
            variables: { operation },
          });
        }

        return await this.transferContextService.loadPaymentContextForTransfer(appointmentId, {
          prices: additionalData.prices,
          isSecondAttempt: additionalData.isSecondAttempt,
        });
      }
    }
  }

  private validatePaymentEligibility(context: TPaymentContext): IPaymentValidationResult {
    switch (context.operation) {
      case EPaymentOperation.AUTHORIZE_PAYMENT:
      case EPaymentOperation.AUTHORIZE_ADDITIONAL_BLOCK_PAYMENT:
        return this.authorizationContextValidationService.validateAuthorizationContext(context);
      case EPaymentOperation.AUTHORIZATION_CANCEL_PAYMENT:
        return this.authorizationCancelContextValidationService.validateAuthorizationCancelContext(context);
      case EPaymentOperation.CAPTURE_PAYMENT:
        return this.captureContextValidationService.validateCaptureContext(context);
      case EPaymentOperation.TRANSFER_PAYMENT:
        return this.transferContextValidationService.validateTransferContext(context);
      default:
        return { success: true, errors: [] };
    }
  }

  private async addProcessPaymentOperationQueue(data: TProcessPaymentOperationData): Promise<void> {
    switch (data.operation) {
      case EPaymentOperation.AUTHORIZE_PAYMENT:
      case EPaymentOperation.AUTHORIZE_ADDITIONAL_BLOCK_PAYMENT:
        return await this.queueInitializeService.addProcessPaymentPreAuthorizationQueue(data);
      case EPaymentOperation.AUTHORIZATION_RECREATE_PAYMENT:
        return await this.queueInitializeService.addProcessPaymentPreAuthorizationRecreateQueue(data);
      case EPaymentOperation.AUTHORIZATION_CANCEL_PAYMENT:
        return await this.queueInitializeService.addProcessPaymentAuthorizationCancelQueue(data);
      case EPaymentOperation.CAPTURE_PAYMENT:
        return await this.queueInitializeService.addProcessPaymentCaptureQueue(data);
      case EPaymentOperation.TRANSFER_PAYMENT:
        return await this.queueInitializeService.addProcessPaymentTransferQueue(data);
    }
  }
}
