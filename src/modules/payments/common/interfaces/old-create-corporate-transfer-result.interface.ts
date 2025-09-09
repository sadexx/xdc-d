import { OldICreateTransfer } from "src/modules/payments/common/interfaces/old-create-transfer.interface";

export interface OldICreateCorporateTransferResult {
  transferResult: OldICreateTransfer;
  paymentMethodInfo: string;
}
