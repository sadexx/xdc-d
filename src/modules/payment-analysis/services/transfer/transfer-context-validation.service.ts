import { Injectable } from "@nestjs/common";
import { ITransferPaymentContext } from "src/modules/payment-analysis/common/interfaces/transfer";
import { IPaymentValidationResult } from "src/modules/payments-new/common/interfaces";

@Injectable()
export class TransferContextValidationService {
  public validateTransferContext(context: ITransferPaymentContext): IPaymentValidationResult {
    const errors: string[] = [];
    const { paymentContext, interpreter } = context;

    if (paymentContext.incomingPayment.items.length <= 0) {
      errors.push("Incoming payment has no items.");
    }

    if (paymentContext.outcomingPayment) {
      errors.push("Outcoming payment already exists.");
    }

    if (!interpreter.paymentInformation || !interpreter.paymentInformation.interpreterSystemForPayout) {
      errors.push("Interpreter has not filled payment information.");
    }

    return {
      success: errors.length === 0,
      errors,
    };
  }
}
