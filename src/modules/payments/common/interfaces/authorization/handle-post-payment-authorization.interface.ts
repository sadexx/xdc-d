import { EPaymentStatus } from "src/modules/payments/common/enums/core";

export interface IHandlePostPaymentAuthorization {
  status: EPaymentStatus;
  error?: string;
}
