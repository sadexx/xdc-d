import { ILfhCompanyPdfData, IRecipientPdfData } from "src/modules/pdf-new/common/interfaces";
import { TWebhookPaymentIntentSucceededPayment } from "src/modules/webhook-processor/common/types";

export interface IDepositChargeReceipt {
  payment: TWebhookPaymentIntentSucceededPayment;
  lfhCompanyData: ILfhCompanyPdfData;
  recipientData: IRecipientPdfData;
  issueDate: string;
  paymentDescription: string;
  paymentDate: string;
  service: string;
}
