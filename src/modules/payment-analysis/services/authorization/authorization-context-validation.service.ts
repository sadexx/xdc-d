import { Injectable } from "@nestjs/common";
import { IAuthorizationPaymentContext } from "src/modules/payment-analysis/common/interfaces/authorization";
import { EPaymentCurrency, EPaymentStatus } from "src/modules/payments-new/common/enums";
import { IPaymentValidationResult } from "src/modules/payments-new/common/interfaces";
import { TLoadExistingPaymentAuthorizationContext } from "src/modules/payment-analysis/common/types/authorization";

@Injectable()
export class AuthorizationContextValidationService {
  public validateAuthorizationContext(context: IAuthorizationPaymentContext): IPaymentValidationResult {
    const { shouldRedirectToWaitList, isClientCorporate } = context;

    if (shouldRedirectToWaitList) {
      return this.validateWaitListAuthorizationContext(context);
    }

    if (isClientCorporate) {
      return this.validateCorporateAuthorizationContext(context);
    } else {
      return this.validateIndividualAuthorizationContext(context);
    }
  }

  private validateWaitListAuthorizationContext(context: IAuthorizationPaymentContext): IPaymentValidationResult {
    const errors: string[] = [];
    const { companyContext, existingPayment, prices, depositChargeContext } = context;
    const unexpectedFields = [companyContext, existingPayment, prices, depositChargeContext].filter(Boolean);

    if (unexpectedFields.length > 0) {
      errors.push("Invalid context state for wait list redirect.");
    }

    return this.buildValidationResult(errors);
  }

  private validateCorporateAuthorizationContext(context: IAuthorizationPaymentContext): IPaymentValidationResult {
    const errors: string[] = [];
    const { companyContext, depositChargeContext, prices, existingPayment, currency } = context;
    const missingFields = [companyContext, prices, depositChargeContext].filter((value) => !value);

    if (missingFields.length > 0) {
      errors.push("Invalid context state for corporate authorization.");
    }

    if (depositChargeContext && prices) {
      if (depositChargeContext.depositAmount < prices.clientFullAmount) {
        errors.push("Insufficient funds on deposit.");
      }
    }

    if (existingPayment) {
      this.validateExistingPayment(existingPayment, errors, currency);
    }

    return this.buildValidationResult(errors);
  }

  private validateIndividualAuthorizationContext(context: IAuthorizationPaymentContext): IPaymentValidationResult {
    const errors: string[] = [];
    const { prices, existingPayment, appointment, currency } = context;

    if (!prices) {
      errors.push("Invalid context state for individual authorization.");
    }

    const paymentInformation = appointment.client.paymentInformation;

    if (!paymentInformation) {
      errors.push("Payment information not filled.");
    } else if (!paymentInformation.stripeClientAccountId || !paymentInformation.stripeClientPaymentMethodId) {
      errors.push("Stripe payment information not filled.");
    }

    if (existingPayment) {
      this.validateExistingPayment(existingPayment, errors, currency);
    }

    return this.buildValidationResult(errors);
  }

  private validateExistingPayment(
    existingPayment: TLoadExistingPaymentAuthorizationContext,
    errors: string[],
    currency: EPaymentCurrency,
  ): void {
    if (existingPayment.items.some((item) => item.status === EPaymentStatus.CAPTURED)) {
      errors.push("Payment already captured.");
    }

    if (existingPayment.currency !== currency) {
      errors.push("Payment currency does not match.");
    }
  }

  private buildValidationResult(errors: string[]): IPaymentValidationResult {
    return {
      success: errors.length === 0,
      errors,
    };
  }
}
