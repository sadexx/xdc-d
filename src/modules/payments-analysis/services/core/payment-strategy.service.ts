import { Injectable } from "@nestjs/common";
import { EPaymentOperation } from "src/modules/payments-analysis/common/enums/core";
import { EPaymentAuthorizationStrategy } from "src/modules/payments-analysis/common/enums/authorization";
import { TPaymentContext, TPaymentStrategy } from "src/modules/payments-analysis/common/types/core";
import { IAuthorizationPaymentContext } from "src/modules/payments-analysis/common/interfaces/authorization";
import { EPaymentCaptureStrategy } from "src/modules/payments-analysis/common/enums/capture";
import { ICapturePaymentContext } from "src/modules/payments-analysis/common/interfaces/capture";
import { EPaymentTransferStrategy } from "src/modules/payments-analysis/common/enums/transfer";
import { ITransferPaymentContext } from "src/modules/payments-analysis/common/interfaces/transfer";
import { EPaymentAuthorizationCancelStrategy } from "src/modules/payments-analysis/common/enums/authorization-cancel";
import { IAuthorizationCancelPaymentContext } from "src/modules/payments-analysis/common/interfaces/authorization-cancel";
import { IAuthorizationRecreatePaymentContext } from "src/modules/payments-analysis/common/interfaces/authorization-recreate";
import { EPaymentAuthorizationRecreateStrategy } from "src/modules/payments-analysis/common/enums/authorization-recreate";
import { IPaymentValidationResult } from "src/modules/payments/common/interfaces/payment-failed";
import { ECompanyFundingSource } from "src/modules/companies/common/enums";

@Injectable()
export class PaymentStrategyService {
  /**
   * Determines the appropriate payment processing strategy based on operation type and validation.
   *
   * @param context - The payment context containing operation details
   * @param validationResult - Validation result to determine if validation failed strategy should be used
   * @returns The specific payment strategy to execute for this operation
   */
  public determinePaymentStrategy(
    context: TPaymentContext,
    validationResult: IPaymentValidationResult,
  ): TPaymentStrategy {
    switch (context.operation) {
      case EPaymentOperation.AUTHORIZE_PAYMENT:
      case EPaymentOperation.AUTHORIZE_ADDITIONAL_BLOCK_PAYMENT:
        return this.determinePaymentAuthorizationStrategy(context, validationResult);
      case EPaymentOperation.AUTHORIZATION_RECREATE_PAYMENT:
        return this.determinePaymentAuthorizationRecreateStrategy(context);
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

    const { waitListContext, isClientCorporate, companyContext } = context;

    if (waitListContext.shouldRedirectToWaitList) {
      return EPaymentAuthorizationStrategy.WAIT_LIST_REDIRECT;
    }

    if (isClientCorporate && companyContext) {
      if (companyContext.company.fundingSource === ECompanyFundingSource.DEPOSIT) {
        return EPaymentAuthorizationStrategy.CORPORATE_DEPOSIT_CHARGE;
      } else {
        return EPaymentAuthorizationStrategy.CORPORATE_POST_PAYMENT;
      }
    }

    return EPaymentAuthorizationStrategy.INDIVIDUAL_STRIPE_AUTH;
  }

  private determinePaymentAuthorizationRecreateStrategy(
    context: IAuthorizationRecreatePaymentContext,
  ): EPaymentAuthorizationRecreateStrategy {
    const { hasPriceChanged } = context;

    if (!hasPriceChanged) {
      return EPaymentAuthorizationRecreateStrategy.REATTACH_EXISTING_PAYMENT;
    }

    if (context.isClientCorporate) {
      return EPaymentAuthorizationRecreateStrategy.CORPORATE_CANCEL_AND_REAUTHORIZE;
    }

    return EPaymentAuthorizationRecreateStrategy.INDIVIDUAL_CANCEL_AND_REAUTHORIZE;
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

    const { isSameCorporateCompany, isClientCorporate } = context;

    if (isSameCorporateCompany) {
      return EPaymentCaptureStrategy.SAME_COMPANY_COMMISSION;
    }

    if (isClientCorporate) {
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
