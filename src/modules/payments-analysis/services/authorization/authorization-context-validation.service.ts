import { Injectable } from "@nestjs/common";
import { IAuthorizationPaymentContext } from "src/modules/payments-analysis/common/interfaces/authorization";
import { EPaymentCurrency, EPaymentStatus } from "src/modules/payments/common/enums/core";
import { TExistingPaymentAuthorizationContext } from "src/modules/payments-analysis/common/types/authorization";
import { IPaymentValidationResult } from "src/modules/payments/common/interfaces/payment-failed";

@Injectable()
export class AuthorizationContextValidationService {
  /**
   * Validates the authorization payment context based on client type and wait list status.
   *
   * Performs validation checks appropriate to the context type:
   * - Wait list contexts: validates no unexpected fields are present
   * - Corporate contexts: validates company data, prices, and deposit information
   * - Individual contexts: validates pricing and Stripe payment information
   *
   * @param context - The authorization payment context to validate
   * @returns Validation result indicating success or failure with error messages
   */
  public validateAuthorizationContext(context: IAuthorizationPaymentContext): IPaymentValidationResult {
    const { waitListContext, isClientCorporate } = context;

    if (waitListContext.shouldRedirectToWaitList) {
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

    const paymentInformation = appointment.client?.paymentInformation;

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
    existingPayment: TExistingPaymentAuthorizationContext,
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
