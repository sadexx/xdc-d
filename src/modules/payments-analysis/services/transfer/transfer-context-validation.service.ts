import { Injectable } from "@nestjs/common";
import { ITransferPaymentContext } from "src/modules/payments-analysis/common/interfaces/transfer";
import { EPaymentStatus, EPaymentSystem } from "src/modules/payments/common/enums/core";
import { IPaymentValidationResult } from "src/modules/payments/common/interfaces/payment-failed";

@Injectable()
export class TransferContextValidationService {
  /**
   * Validates the transfer context based on interpreter type.
   *
   * Performs validation checks appropriate to the interpreter:
   * - Corporate transfer: validates company deposit information and payment status
   * - Individual transfer: validates Stripe payment information and account setup
   *
   * @param context - The transfer payment context to validate
   * @returns Validation result with success status and error messages
   */
  public validateTransferContext(context: ITransferPaymentContext): IPaymentValidationResult {
    if (context.isInterpreterCorporate) {
      return this.validateCorporateTransfer(context);
    } else {
      return this.validateIndividualTransfer(context);
    }
  }

  private validateCorporateTransfer(context: ITransferPaymentContext): IPaymentValidationResult {
    const errors: string[] = [];
    const { paymentContext, company } = context;

    if (!company) {
      errors.push("Invalid context state for wait list redirect.");
    }

    if (paymentContext.incomingPayment.items.length <= 0) {
      errors.push("Incoming payment has no items.");
    }

    for (const paymentItem of paymentContext.incomingPayment.items) {
      if (paymentItem.status !== EPaymentStatus.CAPTURED) {
        errors.push("Some of the incoming payment items has an incorrect status.");
        break;
      }
    }

    if (company && !company.paymentInformation) {
      errors.push(`Company with id ${company.id} does not have payment info.`);
    }

    return this.buildValidationResult(errors);
  }

  private validateIndividualTransfer(context: ITransferPaymentContext): IPaymentValidationResult {
    const errors: string[] = [];
    const { paymentContext, interpreter, isSecondAttempt } = context;

    if (paymentContext.incomingPayment.items.length <= 0) {
      errors.push("Incoming payment has no items.");
    }

    for (const paymentItem of paymentContext.incomingPayment.items) {
      if (paymentItem.status !== EPaymentStatus.CAPTURED) {
        errors.push("Some of the incoming payment items has an incorrect status.");
        break;
      }
    }

    if (paymentContext.outcomingPayment && !isSecondAttempt) {
      errors.push("Outcoming payment already exists.");
    }

    if (!interpreter.paymentInformation || !interpreter.paymentInformation.interpreterSystemForPayout) {
      errors.push("Interpreter has not filled payment information.");
    }

    if (interpreter.paymentInformation) {
      const system = interpreter.paymentInformation.interpreterSystemForPayout;

      if (system === EPaymentSystem.STRIPE && !interpreter.paymentInformation.stripeInterpreterAccountId) {
        errors.push("Interpreter has not filled Stripe account ID.");
      }

      if (system === EPaymentSystem.PAYPAL && !interpreter.paymentInformation.paypalPayerId) {
        errors.push("Interpreter has not filled PayPal payer ID.");
      }
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
