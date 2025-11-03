import { Injectable } from "@nestjs/common";
import { EPaymentOperation } from "src/modules/payment-analysis/common/enums";
import { IPaymentValidationResult } from "src/modules/payments-new/common/interfaces";
import { EPaymentAuthorizationStrategy } from "src/modules/payment-analysis/common/enums/authorization";
import { TPaymentContext, TPaymentStrategy } from "src/modules/payment-analysis/common/types";
import { IAuthorizationPaymentContext } from "src/modules/payment-analysis/common/interfaces/authorization";
import { EPaymentCaptureStrategy } from "src/modules/payment-analysis/common/enums/capture";
import { ICapturePaymentContext } from "src/modules/payment-analysis/common/interfaces/capture";
import { EPaymentTransferStrategy } from "src/modules/payment-analysis/common/enums/transfer";
import { ITransferPaymentContext } from "src/modules/payment-analysis/common/interfaces/transfer";
import { EPaymentAuthorizationCancelStrategy } from "src/modules/payment-analysis/common/enums/authorization-cancel";
import { IAuthorizationCancelPaymentContext } from "src/modules/payment-analysis/common/interfaces/authorization-cancel";

@Injectable()
export class PaymentStrategyService {
  public determinePaymentStrategy(
    context: TPaymentContext,
    validationResult: IPaymentValidationResult,
  ): TPaymentStrategy {
    switch (context.operation) {
      case EPaymentOperation.AUTHORIZE_PAYMENT:
        return this.determinePaymentAuthorizationStrategy(context, validationResult);
      case EPaymentOperation.AUTHORIZATION_CANCEL_PAYMENT:
        return this.determinePaymentAuthorizationCancelStrategy(context, validationResult);
      case EPaymentOperation.CAPTURE_PAYMENT:
        return this.determinePaymentCaptureStrategy(context, validationResult);
      case EPaymentOperation.TRANSFER_PAYMENT:
        return this.determinePaymentTransferStrategy(context, validationResult);
    }
  }

  private determinePaymentAuthorizationStrategy(
    context: IAuthorizationPaymentContext,
    validationResult: IPaymentValidationResult,
  ): EPaymentAuthorizationStrategy {
    if (!validationResult.success) {
      return EPaymentAuthorizationStrategy.VALIDATION_FAILED;
    }

    const { waitListContext, isClientCorporate } = context;

    if (waitListContext.shouldRedirectToWaitList) {
      return EPaymentAuthorizationStrategy.WAIT_LIST_REDIRECT;
    }

    if (isClientCorporate) {
      return EPaymentAuthorizationStrategy.CORPORATE_DEPOSIT_CHARGE;
    }

    return EPaymentAuthorizationStrategy.INDIVIDUAL_STRIPE_AUTH;
  }

  private determinePaymentAuthorizationCancelStrategy(
    context: IAuthorizationCancelPaymentContext,
    validationResult: IPaymentValidationResult,
  ): EPaymentAuthorizationCancelStrategy {
    if (!validationResult.success) {
      return EPaymentAuthorizationCancelStrategy.VALIDATION_FAILED;
    }

    const { isRestricted, isClientCorporate } = context;

    if (isRestricted) {
      return EPaymentAuthorizationCancelStrategy.AUTHORIZATION_CANCEL_NOT_ALLOWED;
    }

    if (isClientCorporate) {
      return EPaymentAuthorizationCancelStrategy.CORPORATE_AUTHORIZATION_CANCEL;
    }

    return EPaymentAuthorizationCancelStrategy.INDIVIDUAL_AUTHORIZATION_CANCEL;
  }

  private determinePaymentCaptureStrategy(
    context: ICapturePaymentContext,
    validationResult: IPaymentValidationResult,
  ): EPaymentCaptureStrategy {
    if (!validationResult.success) {
      return EPaymentCaptureStrategy.VALIDATION_FAILED;
    }

    const { corporateContext } = context;

    if (corporateContext.isSameCorporateCompany) {
      return EPaymentCaptureStrategy.SAME_COMPANY_COMMISSION;
    }

    if (corporateContext.isClientCorporate) {
      return EPaymentCaptureStrategy.CORPORATE_CAPTURE;
    }

    return EPaymentCaptureStrategy.INDIVIDUAL_CAPTURE;
  }

  private determinePaymentTransferStrategy(
    context: ITransferPaymentContext,
    validationResult: IPaymentValidationResult,
  ): EPaymentTransferStrategy {
    if (!validationResult.success) {
      return EPaymentTransferStrategy.VALIDATION_FAILED;
    }

    if (context.isInterpreterCorporate) {
      return EPaymentTransferStrategy.CORPORATE_TRANSFER;
    }

    return EPaymentTransferStrategy.INDIVIDUAL_TRANSFER;
  }
}
