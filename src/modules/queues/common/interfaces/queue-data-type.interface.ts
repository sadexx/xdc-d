import { EJobType, EQueueType } from "src/modules/queues/common/enums";
import { TAppointmentsWithoutClientVisit } from "src/modules/appointments/appointment/common/types";
import { Message } from "@aws-sdk/client-sqs";
import {
  TProcessNotifyMembershipChanges,
  TProcessNotifyMembershipChangesMembershipAssignment,
} from "src/modules/memberships/common/types";
import { EMembershipNotificationType, EMembershipPricingRegion } from "src/modules/memberships/common/enums";
import { CheckInOutAppointmentDto } from "src/modules/appointments/appointment/common/dto";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import {
  IGenerateCorporatePayOutReceipt,
  IGenerateCorporateTaxInvoiceReceipt,
  IGenerateInterpreterBadge,
  IGenerateMembershipInvoice,
  IGeneratePayInReceipt,
  IGeneratePayOutReceipt,
  IGenerateTaxInvoiceReceipt,
} from "src/modules/pdf/common/interfaces";
import { TWebhookPaymentIntentSucceededPayment } from "src/modules/webhook-processor/common/types";
import { EPaymentOperation } from "src/modules/payments-analysis/common/enums/core";
import { IPaymentAnalysisAdditionalData } from "src/modules/payments-analysis/common/interfaces/core";
import {
  IMakePreAuthorization,
  IMakePreAuthorizationRecreate,
  IMakeAuthorizationCancel,
  IMakeCaptureAndTransfer,
  IMakeTransfer,
} from "src/modules/payments/common/interfaces/core";

export interface IQueueData {
  queueEnum: EQueueType;
  jobItem: IQueueJobType;
}

export interface IQueueDataBulk {
  queueEnum: EQueueType;
  jobItems: IQueueJobType[];
}

export interface IProcessNotifyMembershipChangesData {
  jobName: EJobType.PROCESS_NOTIFY_MEMBERSHIP_CHANGES;
  payload: {
    membership: TProcessNotifyMembershipChanges;
    membershipAssignment: TProcessNotifyMembershipChangesMembershipAssignment;
    notificationType: EMembershipNotificationType;
    membershipPricingRegion?: EMembershipPricingRegion;
  };
}

export interface IProcessStripeCancelSubscriptionsData {
  jobName: EJobType.PROCESS_STRIPE_CANCEL_SUBSCRIPTIONS;
  payload: { subscriptionId: string };
}

interface IProcessStripeUpdateSubscriptionPriceData {
  jobName: EJobType.PROCESS_STRIPE_UPDATE_SUBSCRIPTIONS_PRICE;
  payload: { customerId: string; newPriceId: string };
}

interface IProcessSumSubWebhookData {
  jobName: EJobType.PROCESS_SUMSUB_WEBHOOK;
  payload: { message: Message };
}

interface IProcessDocusignWebhookData {
  jobName: EJobType.PROCESS_DOCUSIGN_WEBHOOK;
  payload: { message: Message };
}

interface IProcessStripeWebhookData {
  jobName: EJobType.PROCESS_STRIPE_WEBHOOK;
  payload: { message: Message };
}

interface IProcessCloseMeetingData {
  jobName: EJobType.PROCESS_CLOSE_MEETING;
  payload: { chimeMeetingId: string };
}

interface IProcessCloseMeetingWithoutClientVisitData {
  jobName: EJobType.PROCESS_CLOSE_MEETING_WITHOUT_CLIENT_VISIT;
  payload: { appointment: TAppointmentsWithoutClientVisit };
}

interface IProcessCheckInOutAppointmentData {
  jobName: EJobType.PROCESS_CHECK_IN_OUT_APPOINTMENT;
  payload: { appointmentId: string; dto: CheckInOutAppointmentDto; user: ITokenUserData };
}

interface IProcessPaymentOperationData {
  jobName: EJobType.PROCESS_PAYMENT_OPERATION;
  payload: { appointmentId: string; operation: EPaymentOperation; additionalData: IPaymentAnalysisAdditionalData };
}

interface IProcessPaymentPreAuthorizationData {
  jobName: EJobType.PROCESS_PAYMENT_PRE_AUTHORIZATION;
  payload: IMakePreAuthorization;
}

interface IProcessPaymentPreAuthorizationRecreateData {
  jobName: EJobType.PROCESS_PAYMENT_PRE_AUTHORIZATION_RECREATE;
  payload: IMakePreAuthorizationRecreate;
}

interface IProcessPaymentAuthorizationCancelData {
  jobName: EJobType.PROCESS_PAYMENT_AUTHORIZATION_CANCEL;
  payload: IMakeAuthorizationCancel;
}

interface IProcessPaymentCaptureData {
  jobName: EJobType.PROCESS_PAYMENT_CAPTURE;
  payload: IMakeCaptureAndTransfer;
}

interface IProcessPaymentTransferData {
  jobName: EJobType.PROCESS_PAYMENT_TRANSFER;
  payload: IMakeTransfer;
}

interface IProcessPayInReceiptPdfGenerationData {
  jobName: EJobType.PROCESS_PAY_IN_RECEIPT_PDF_GENERATION;
  payload: IGeneratePayInReceipt;
}

interface IProcessPayOutReceiptPdfGenerationData {
  jobName: EJobType.PROCESS_PAY_OUT_RECEIPT_PDF_GENERATION;
  payload: IGeneratePayOutReceipt;
}

interface IProcessTaxInvoiceReceiptPdfGenerationData {
  jobName: EJobType.PROCESS_TAX_INVOICE_RECEIPT_PDF_GENERATION;
  payload: IGenerateTaxInvoiceReceipt;
}

interface IProcessMembershipInvoicePdfGenerationData {
  jobName: EJobType.PROCESS_MEMBERSHIP_INVOICE_PDF_GENERATION;
  payload: IGenerateMembershipInvoice;
}

interface IProcessInterpreterBadgePdfGenerationData {
  jobName: EJobType.PROCESS_INTERPRETER_BADGE_PDF_GENERATION;
  payload: IGenerateInterpreterBadge;
}

interface IProcessDepositChargePdfGenerationData {
  jobName: EJobType.PROCESS_DEPOSIT_CHARGE_PDF_GENERATION;
  payload: TWebhookPaymentIntentSucceededPayment;
}

interface IProcessCorporatePayOutReceiptPdfGenerationData {
  jobName: EJobType.PROCESS_CORPORATE_PAYOUT_RECEIPT_PDF_GENERATION;
  payload: IGenerateCorporatePayOutReceipt;
}

interface IProcessCorporateTaxInvoiceReceiptPdfGenerationData {
  jobName: EJobType.PROCESS_CORPORATE_TAX_INVOICE_RECEIPT_PDF_GENERATION;
  payload: IGenerateCorporateTaxInvoiceReceipt;
}

export type IQueueJobType =
  | IProcessNotifyMembershipChangesData
  | IProcessStripeCancelSubscriptionsData
  | IProcessStripeUpdateSubscriptionPriceData
  | IProcessSumSubWebhookData
  | IProcessDocusignWebhookData
  | IProcessStripeWebhookData
  | IProcessCloseMeetingData
  | IProcessCloseMeetingWithoutClientVisitData
  | IProcessCheckInOutAppointmentData
  | IProcessPaymentOperationData
  | IProcessPaymentPreAuthorizationData
  | IProcessPaymentPreAuthorizationRecreateData
  | IProcessPaymentAuthorizationCancelData
  | IProcessPaymentCaptureData
  | IProcessPaymentTransferData
  | IProcessPayInReceiptPdfGenerationData
  | IProcessPayOutReceiptPdfGenerationData
  | IProcessTaxInvoiceReceiptPdfGenerationData
  | IProcessMembershipInvoicePdfGenerationData
  | IProcessInterpreterBadgePdfGenerationData
  | IProcessDepositChargePdfGenerationData
  | IProcessCorporatePayOutReceiptPdfGenerationData
  | IProcessCorporateTaxInvoiceReceiptPdfGenerationData;
