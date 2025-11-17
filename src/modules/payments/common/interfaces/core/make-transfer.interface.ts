import { EPaymentTransferStrategy } from "src/modules/payments-analysis/common/enums/transfer";
import { ITransferPaymentContext } from "src/modules/payments-analysis/common/interfaces/transfer";
import { IPaymentValidationResult } from "src/modules/payments/common/interfaces/payment-failed";

export interface IMakeTransfer {
  strategy: EPaymentTransferStrategy;
  context: ITransferPaymentContext;
  validationResult: IPaymentValidationResult;
}
