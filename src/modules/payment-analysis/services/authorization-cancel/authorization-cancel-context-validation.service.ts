import { Injectable } from "@nestjs/common";
import { IAuthorizationCancelPaymentContext } from "src/modules/payment-analysis/common/interfaces/authorization-cancel";
import { IPaymentValidationResult } from "src/modules/payments-new/common/interfaces";
import { EPaymentDirection, EPaymentSystem } from "src/modules/payments-new/common/enums";

@Injectable()
export class AuthorizationCancelContextValidationService {
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
