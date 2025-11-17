import { EPaymentOperation } from "src/modules/payments-analysis/common/enums/core";
import {
  IMakePreAuthorization,
  IMakePreAuthorizationRecreate,
  IMakeAuthorizationCancel,
  IMakeCaptureAndTransfer,
  IMakeTransfer,
} from "src/modules/payments/common/interfaces/core";

export type TProcessPaymentOperationData =
  | IProcessAuthorizationData
  | IProcessPreAuthorizationRecreateData
  | IProcessAuthorizationCancelData
  | IProcessCaptureData
  | IProcessTransferData;

interface IProcessAuthorizationData extends IMakePreAuthorization {
  operation: EPaymentOperation.AUTHORIZE_PAYMENT | EPaymentOperation.AUTHORIZE_ADDITIONAL_BLOCK_PAYMENT;
}

interface IProcessPreAuthorizationRecreateData extends IMakePreAuthorizationRecreate {
  operation: EPaymentOperation.AUTHORIZATION_RECREATE_PAYMENT;
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
