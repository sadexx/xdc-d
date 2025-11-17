import { Injectable } from "@nestjs/common";
import { IAuthorizationCancelPaymentContext } from "src/modules/payments-analysis/common/interfaces/authorization-cancel";
import { EPaymentDirection, EPaymentSystem } from "src/modules/payments/common/enums/core";
import { IPaymentValidationResult } from "src/modules/payments/common/interfaces/payment-failed";

@Injectable()
export class AuthorizationCancelContextValidationService {
  /**
   * Validates the authorization cancel context based on client type.
   *
   * Verifies payment system and direction are correct for the cancellation:
   * - Corporate: validates deposit system and incoming direction
   * - Individual: validates Stripe system and incoming direction
   *
   * @param context - The authorization cancel context to validate
   * @returns Validation result with success status and error messages
   */
  public validateAuthorizationCancelContext(context: IAuthorizationCancelPaymentContext): IPaymentValidationResult {
    const { isClientCorporate } = context;

    if (isClientCorporate) {
      return this.validateCorporateAuthorizationCancelContext(context);
    } else {
      return this.validateIndividualAuthorizationCancelContext(context);
    }
  }

  private validateCorporateAuthorizationCancelContext(
    context: IAuthorizationCancelPaymentContext,
  ): IPaymentValidationResult {
    const errors: string[] = [];
    const { payment } = context;

    if (payment.system !== EPaymentSystem.DEPOSIT) {
      errors.push("Incorrect payment system.");
    }

    if (payment.direction !== EPaymentDirection.INCOMING) {
      errors.push("Incorrect payment direction.");
    }

    return this.buildValidationResult(errors);
  }

  private validateIndividualAuthorizationCancelContext(
    context: IAuthorizationCancelPaymentContext,
  ): IPaymentValidationResult {
    const errors: string[] = [];
    const { payment } = context;

    if (payment.system !== EPaymentSystem.STRIPE) {
      errors.push("Incorrect payment system.");
    }

    if (payment.direction !== EPaymentDirection.INCOMING) {
      errors.push("Incorrect payment direction.");
    }

    return this.buildValidationResult(errors);
  }

  private buildValidationResult(errors: string[]): IPaymentValidationResult {
    return {
      success: errors.length === 0,
      errors,
    };
  }
}
