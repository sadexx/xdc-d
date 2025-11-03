import { IAuthorizationPaymentContext } from "src/modules/payment-analysis/common/interfaces/authorization";
import { EPaymentAuthorizationStrategy } from "src/modules/payment-analysis/common/enums/authorization";
import { ICapturePaymentContext } from "src/modules/payment-analysis/common/interfaces/capture";
import { EPaymentCaptureStrategy } from "src/modules/payment-analysis/common/enums/capture";
import { ITransferPaymentContext } from "src/modules/payment-analysis/common/interfaces/transfer";
import { EPaymentTransferStrategy } from "src/modules/payment-analysis/common/enums/transfer";
import { IAuthorizationCancelPaymentContext } from "src/modules/payment-analysis/common/interfaces/authorization-cancel";
import { EPaymentAuthorizationCancelStrategy } from "src/modules/payment-analysis/common/enums/authorization-cancel";

/**
 * Type
 */

export type TPaymentContext =
  | IAuthorizationPaymentContext
  | IAuthorizationCancelPaymentContext
  | ICapturePaymentContext
  | ITransferPaymentContext;

export type TPaymentStrategy =
  | EPaymentAuthorizationStrategy
  | EPaymentAuthorizationCancelStrategy
  | EPaymentCaptureStrategy
  | EPaymentTransferStrategy;
