import { BadRequestException, Injectable } from "@nestjs/common";
import {
  AuthorizationContextService,
  AuthorizationContextValidationService,
} from "src/modules/payment-analysis/services/authorization";
import { TPaymentContext } from "src/modules/payment-analysis/common/types";
import { IPaymentValidationResult } from "src/modules/payments-new/common/interfaces";
import { QueueInitializeService } from "src/modules/queues/services";
import { PaymentStrategyService } from "src/modules/payment-analysis/services";
import { CaptureContextService, CaptureContextValidationService } from "src/modules/payment-analysis/services/capture";
import {
  IPaymentAnalysisAdditionalData,
  TProcessPaymentOperationData,
} from "src/modules/payment-analysis/common/interfaces";
import {
  TransferContextService,
  TransferContextValidationService,
} from "src/modules/payment-analysis/services/transfer";
import { EPaymentOperation } from "src/modules/payment-analysis/common/enums";

@Injectable()
export class PaymentAnalysisService {
  constructor(
    private readonly authorizationContextService: AuthorizationContextService,
    private readonly authorizationContextValidationService: AuthorizationContextValidationService,
    private readonly captureContextService: CaptureContextService,
    private readonly captureContextValidationService: CaptureContextValidationService,
    private readonly transferContextService: TransferContextService,
    private readonly transferContextValidationService: TransferContextValidationService,
    private readonly paymentStrategyService: PaymentStrategyService,
    private readonly queueInitializeService: QueueInitializeService,
  ) {}

  public async analyzePaymentAction(
    appointmentId: string,
    operation: EPaymentOperation,
    additionalData?: IPaymentAnalysisAdditionalData,
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
    additionalData?: IPaymentAnalysisAdditionalData,
  ): Promise<TPaymentContext | null> {
    switch (operation) {
      case EPaymentOperation.AUTHORIZE_PAYMENT:
        return await this.authorizationContextService.loadPaymentContextForAuthorization(appointmentId);
      case EPaymentOperation.CAPTURE_PAYMENT:
        return await this.captureContextService.loadPaymentContextForCapture(appointmentId);
      case EPaymentOperation.TRANSFER_PAYMENT:
        if (!additionalData || !additionalData.prices) {
          throw new BadRequestException("For transfer operation additional data is required.");
        }

        return await this.transferContextService.loadPaymentContextForTransfer(appointmentId, additionalData.prices);
    }
  }

  private validatePaymentEligibility(context: TPaymentContext): IPaymentValidationResult {
    switch (context.operation) {
      case EPaymentOperation.AUTHORIZE_PAYMENT:
        return this.authorizationContextValidationService.validateAuthorizationContext(context);
      case EPaymentOperation.CAPTURE_PAYMENT:
        return this.captureContextValidationService.validateCaptureContext(context);
      case EPaymentOperation.TRANSFER_PAYMENT:
        return this.transferContextValidationService.validateTransferContext(context);
    }
  }

  private async addProcessPaymentOperationQueue(data: TProcessPaymentOperationData): Promise<void> {
    switch (data.operation) {
      case EPaymentOperation.AUTHORIZE_PAYMENT:
        return await this.queueInitializeService.addProcessPaymentPreAuthorizationQueue(data);
      case EPaymentOperation.CAPTURE_PAYMENT:
        break;
    }
  }
}
