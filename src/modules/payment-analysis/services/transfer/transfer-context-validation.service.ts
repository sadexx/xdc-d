import { Injectable } from "@nestjs/common";
import { ITransferPaymentContext } from "src/modules/payment-analysis/common/interfaces/transfer";
import { IPaymentValidationResult } from "src/modules/payments-new/common/interfaces";
import { EPaymentStatus, EPaymentSystem } from "src/modules/payments-new/common/enums";

@Injectable()
export class TransferContextValidationService {
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
    const { paymentContext, interpreter } = context;

    if (paymentContext.incomingPayment.items.length <= 0) {
      errors.push("Incoming payment has no items.");
    }

    for (const paymentItem of paymentContext.incomingPayment.items) {
      if (paymentItem.status !== EPaymentStatus.CAPTURED) {
        errors.push("Some of the incoming payment items has an incorrect status.");
        break;
      }
    }

    if (paymentContext.outcomingPayment) {
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
