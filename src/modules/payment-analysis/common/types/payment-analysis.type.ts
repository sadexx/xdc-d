import { IAuthorizationPaymentContext } from "src/modules/payment-analysis/common/interfaces/authorization";
import { EPaymentAuthorizationStrategy } from "src/modules/payment-analysis/common/enums/authorization";
import { ICapturePaymentContext } from "src/modules/payment-analysis/common/interfaces/capture";
import { EPaymentCaptureStrategy } from "src/modules/payment-analysis/common/enums/capture";
import { ITransferPaymentContext } from "src/modules/payment-analysis/common/interfaces/transfer";

/**
 * Type
 */

export type TPaymentContext = IAuthorizationPaymentContext | ICapturePaymentContext | ITransferPaymentContext;

export type TPaymentStrategy = EPaymentAuthorizationStrategy | EPaymentCaptureStrategy;
