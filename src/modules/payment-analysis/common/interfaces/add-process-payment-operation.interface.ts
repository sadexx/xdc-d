import { EPaymentOperation } from "src/modules/payment-analysis/common/enums";
import {
  IMakeAuthorizationCancel,
  IMakeCaptureAndTransfer,
  IMakePreAuthorization,
  IMakeTransfer,
} from "src/modules/payments-new/common/interfaces";

export type TProcessPaymentOperationData =
  | IProcessAuthorizationData
  | IProcessAuthorizationCancelData
  | IProcessCaptureData
  | IProcessTransferData;

interface IProcessAuthorizationData extends IMakePreAuthorization {
  operation: EPaymentOperation.AUTHORIZE_PAYMENT;
}

interface IProcessAuthorizationCancelData extends IMakeAuthorizationCancel {
  operation: EPaymentOperation.AUTHORIZATION_CANCEL_PAYMENT;
}

interface IProcessCaptureData extends IMakeCaptureAndTransfer {
  operation: EPaymentOperation.CAPTURE_PAYMENT;
}

interface IProcessTransferData extends IMakeTransfer {
  operation: EPaymentOperation.TRANSFER_PAYMENT;
}
