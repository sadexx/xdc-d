import { Injectable } from "@nestjs/common";
import { EPaymentOperation } from "src/modules/payment-analysis/common/enums";
import { IPaymentValidationResult } from "src/modules/payments-new/common/interfaces";
import { EPaymentAuthorizationStrategy } from "src/modules/payment-analysis/common/enums/authorization";
import { TPaymentContext, TPaymentStrategy } from "src/modules/payment-analysis/common/types";
import { IAuthorizationPaymentContext } from "src/modules/payment-analysis/common/interfaces/authorization";
import { EPaymentCaptureStrategy } from "src/modules/payment-analysis/common/enums/capture";
import { ICapturePaymentContext } from "src/modules/payment-analysis/common/interfaces/capture";

@Injectable()
export class PaymentStrategyService {
  public determinePaymentStrategy(
    context: TPaymentContext,
    validationResult: IPaymentValidationResult,
  ): TPaymentStrategy {
    switch (context.operation) {
      case EPaymentOperation.AUTHORIZE_PAYMENT:
        return this.determinePaymentAuthorizationStrategy(context, validationResult);
      case EPaymentOperation.CAPTURE_PAYMENT:
        return this.determinePaymentCaptureStrategy(context, validationResult);
    }
  }

  private determinePaymentAuthorizationStrategy(
    context: IAuthorizationPaymentContext,
    validationResult: IPaymentValidationResult,
  ): EPaymentAuthorizationStrategy {
    if (!validationResult.success) {
      return EPaymentAuthorizationStrategy.VALIDATION_FAILED;
    }

    if (context.shouldRedirectToWaitList) {
      return EPaymentAuthorizationStrategy.WAIT_LIST_REDIRECT;
    }

    if (context.isClientCorporate) {
      return EPaymentAuthorizationStrategy.CORPORATE_DEPOSIT_CHARGE;
    }

    return EPaymentAuthorizationStrategy.INDIVIDUAL_STRIPE_AUTH;
  }

  private determinePaymentCaptureStrategy(
    context: ICapturePaymentContext,
    validationResult: IPaymentValidationResult,
  ): EPaymentCaptureStrategy {
    if (!validationResult.success) {
      return EPaymentCaptureStrategy.VALIDATION_FAILED;
    }

    if (context.corporateContext.isSameCorporateCompany) {
      return EPaymentCaptureStrategy.SAME_COMPANY_COMMISSION;
    }

    if (context.corporateContext.isClientCorporate) {
      return EPaymentCaptureStrategy.CORPORATE_CAPTURE;
    }

    return EPaymentCaptureStrategy.INDIVIDUAL_CAPTURE;
  }
}
