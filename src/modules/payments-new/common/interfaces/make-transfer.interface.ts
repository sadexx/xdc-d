import { EPaymentTransferStrategy } from "src/modules/payment-analysis/common/enums/transfer";
import { ITransferPaymentContext } from "src/modules/payment-analysis/common/interfaces/transfer";
import { IPaymentValidationResult } from "src/modules/payments-new/common/interfaces";

export interface IMakeTransfer {
  strategy: EPaymentTransferStrategy;
  context: ITransferPaymentContext;
  validationResult: IPaymentValidationResult;
}
