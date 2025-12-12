import { Injectable } from "@nestjs/common";
import { IAuthorizationPaymentContext } from "src/modules/payments-analysis/common/interfaces/authorization";
import { ECompanyFundingSource } from "src/modules/companies/common/enums";
import { IPaymentValidationResult } from "src/modules/payments/common/interfaces/payment-failed";
import { TExistingPaymentAuthorizationContext } from "src/modules/payments-analysis/common/types/authorization";
import { EPaymentCurrency, EPaymentStatus } from "src/modules/payments/common/enums/core";

@Injectable()
export class AuthorizationContextValidationService {
  /**
   * Validates the authorization payment context based on client type and wait list status.
   *
   * Performs validation checks appropriate to the context type:
   * - Corporate contexts: validates company data, prices, and deposit information
   * - Individual contexts: validates pricing and Stripe payment information
   *
   * @param context - The authorization payment context to validate
   * @returns Validation result indicating success or failure with error messages
   */
  public validateAuthorizationContext(context: IAuthorizationPaymentContext): IPaymentValidationResult {
    const { isClientCorporate } = context;

    if (isClientCorporate) {
      return this.validateCorporateAuthorizationContext(context);
    } else {
      return this.validateIndividualAuthorizationContext(context);
    }
  }

  private validateCorporateAuthorizationContext(context: IAuthorizationPaymentContext): IPaymentValidationResult {
    const errors: string[] = [];
    const { companyContext, companyAdditionalDataContext, prices, existingPayment, currency } = context;
    const missingFields = [companyContext, prices, companyAdditionalDataContext].filter((value) => !value);

    if (missingFields.length > 0) {
      errors.push("Invalid context state for corporate authorization.");
    }

    if (companyContext?.company.fundingSource === ECompanyFundingSource.DEPOSIT) {
      if (!companyAdditionalDataContext?.depositChargeContext) {
        errors.push("Invalid context state for deposit charge.");
      }
    }

    if (companyContext?.company.fundingSource === ECompanyFundingSource.POST_PAYMENT) {
      if (!companyAdditionalDataContext?.postPaymentAuthorizationContext) {
        errors.push("Invalid context state for deposit charge.");
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
