import { IAuthorizationPaymentContext } from "src/modules/payments-analysis/common/interfaces/authorization";
import { EPaymentAuthorizationStrategy } from "src/modules/payments-analysis/common/enums/authorization";
import { ICapturePaymentContext } from "src/modules/payments-analysis/common/interfaces/capture";
import { EPaymentCaptureStrategy } from "src/modules/payments-analysis/common/enums/capture";
import { ITransferPaymentContext } from "src/modules/payments-analysis/common/interfaces/transfer";
import { EPaymentTransferStrategy } from "src/modules/payments-analysis/common/enums/transfer";
import { IAuthorizationCancelPaymentContext } from "src/modules/payments-analysis/common/interfaces/authorization-cancel";
import { EPaymentAuthorizationCancelStrategy } from "src/modules/payments-analysis/common/enums/authorization-cancel";
import { IAuthorizationRecreatePaymentContext } from "src/modules/payments-analysis/common/interfaces/authorization-recreate";
import { EPaymentAuthorizationRecreateStrategy } from "src/modules/payments-analysis/common/enums/authorization-recreate";

/**
 * Type
 */

export type TPaymentContext =
  | IAuthorizationPaymentContext
  | IAuthorizationRecreatePaymentContext
  | IAuthorizationCancelPaymentContext
  | ICapturePaymentContext
  | ITransferPaymentContext;

export type TPaymentStrategy =
  | EPaymentAuthorizationStrategy
  | EPaymentAuthorizationRecreateStrategy
  | EPaymentAuthorizationCancelStrategy
  | EPaymentCaptureStrategy
  | EPaymentTransferStrategy;
