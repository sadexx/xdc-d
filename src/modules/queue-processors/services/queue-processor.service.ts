import { Injectable } from "@nestjs/common";
import { Job } from "bullmq";
import { EJobType, EQueueType } from "src/modules/queues/common/enums";
import { MembershipsService } from "src/modules/memberships/services";
import { StripeSubscriptionsService } from "src/modules/stripe/services";
import { IQueueJobType } from "src/modules/queues/common/interfaces";
import { LokiLogger } from "src/common/logger";
import { IQueueProcessor } from "src/modules/queue-processors/common/interfaces";
import {
  WebhookDocusignService,
  WebhookStripeService,
  WebhookSumSubService,
} from "src/modules/webhook-processor/services";
import { MeetingClosingService } from "src/modules/chime-meeting-configuration/services";
import { AppointmentExternalSessionService } from "src/modules/appointments/appointment/services";
import { PaymentsExecutionService, PaymentsFinalFailureService } from "src/modules/payments/services";
import { PdfService } from "src/modules/pdf/services";
import { PaymentAnalysisService } from "src/modules/payments-analysis/services/core";
import { PAYMENTS_EXECUTION_QUEUE_RETRIES } from "src/modules/queues/common/constants";

@Injectable()
export class QueueProcessorService implements IQueueProcessor {
  private readonly lokiLogger = new LokiLogger(QueueProcessorService.name);
  constructor(
    private readonly membershipsService: MembershipsService,
    private readonly stripeSubscriptionsService: StripeSubscriptionsService,
    private readonly webhookStripeService: WebhookStripeService,
    private readonly webhookDocusignService: WebhookDocusignService,
    private readonly webhookSumSubService: WebhookSumSubService,
    private readonly meetingClosingService: MeetingClosingService,
    private readonly appointmentExternalSessionService: AppointmentExternalSessionService,
    private readonly paymentAnalysisService: PaymentAnalysisService,
    private readonly paymentsExecutionService: PaymentsExecutionService,
    private readonly paymentsFinalFailureService: PaymentsFinalFailureService,
    private readonly pdfService: PdfService,
  ) {}

  public async processJob(queueEnum: EQueueType, job: Job<IQueueJobType>): Promise<void> {
    switch (queueEnum) {
      case EQueueType.PAYMENTS_QUEUE:
        return this.handlePaymentsJob(job);
      case EQueueType.PAYMENTS_ANALYSIS_QUEUE:
        return this.handlePaymentsAnalysisJob(job);
      case EQueueType.PAYMENTS_EXECUTION_QUEUE:
        return this.handlePaymentExecutionJob(job);
      case EQueueType.PDF_GENERATION_QUEUE:
        return this.handlePdfGenerationJob(job);
      case EQueueType.NOTIFICATIONS_QUEUE:
        return this.handleNotificationsJob(job);
      case EQueueType.APPOINTMENTS_QUEUE:
        return this.handleAppointmentsJob(job);
      case EQueueType.WEBHOOKS_QUEUE:
        return this.handleWebhooksJob(job);

      default:
        return this.handleDefaultJob(job);
    }
  }

  private async handlePaymentsJob(job: Job<IQueueJobType>): Promise<void> {
    switch (job.data.jobName) {
      case EJobType.PROCESS_STRIPE_CANCEL_SUBSCRIPTIONS: {
        const { subscriptionId } = job.data.payload;

        return await this.stripeSubscriptionsService.cancelSubscriptionById(subscriptionId);
      }
      case EJobType.PROCESS_STRIPE_UPDATE_SUBSCRIPTIONS_PRICE: {
        const { customerId, newPriceId } = job.data.payload;

        return await this.stripeSubscriptionsService.updateSubscriptionPrice(customerId, newPriceId);
      }
      default:
        return this.handleUnknownJob(job);
    }
  }

  private async handlePaymentsAnalysisJob(job: Job<IQueueJobType>): Promise<void> {
    switch (job.data.jobName) {
      case EJobType.PROCESS_PAYMENT_OPERATION: {
        const { appointmentId, operation, additionalData } = job.data.payload;

        return await this.paymentAnalysisService.analyzePaymentAction(appointmentId, operation, additionalData);
      }
      default:
        return this.handleUnknownJob(job);
    }
  }

  private async handlePaymentExecutionJob(job: Job<IQueueJobType>): Promise<void> {
    try {
      switch (job.data.jobName) {
        case EJobType.PROCESS_PAYMENT_PRE_AUTHORIZATION: {
          return await this.paymentsExecutionService.makePreAuthorization(job.data.payload);
        }
        case EJobType.PROCESS_PAYMENT_PRE_AUTHORIZATION_RECREATE: {
          return await this.paymentsExecutionService.makePreAuthorizationRecreate(job.data.payload);
        }
        case EJobType.PROCESS_PAYMENT_AUTHORIZATION_CANCEL: {
          return await this.paymentsExecutionService.makePreAuthorizationCancel(job.data.payload);
        }
        case EJobType.PROCESS_PAYMENT_CAPTURE: {
          return await this.paymentsExecutionService.makeCaptureAndTransfer(job.data.payload);
        }
        case EJobType.PROCESS_PAYMENT_TRANSFER: {
          return await this.paymentsExecutionService.makeTransfer(job.data.payload);
        }
        default:
          return this.handleUnknownJob(job);
      }
    } catch (error) {
      if (job.attemptsMade >= PAYMENTS_EXECUTION_QUEUE_RETRIES - 1) {
        switch (job.data.jobName) {
          case EJobType.PROCESS_PAYMENT_PRE_AUTHORIZATION: {
            await this.paymentsFinalFailureService.handleMakePreAuthorizationFailure(job.data.payload);
            break;
          }
          case EJobType.PROCESS_PAYMENT_CAPTURE: {
            await this.paymentsFinalFailureService.handleMakeCaptureAndTransferFailure(job.data.payload);
            break;
          }
        }
      }

      throw error;
    }
  }

  private async handlePdfGenerationJob(job: Job<IQueueJobType>): Promise<void> {
    switch (job.data.jobName) {
      case EJobType.PROCESS_PAY_IN_RECEIPT_PDF_GENERATION: {
        return await this.pdfService.generatePayInReceipt(job.data.payload);
      }
      case EJobType.PROCESS_PAY_OUT_RECEIPT_PDF_GENERATION: {
        return await this.pdfService.generatePayOutReceipt(job.data.payload);
      }
      case EJobType.PROCESS_TAX_INVOICE_RECEIPT_PDF_GENERATION: {
        return await this.pdfService.generateTaxInvoiceReceipt(job.data.payload);
      }
      case EJobType.PROCESS_MEMBERSHIP_INVOICE_PDF_GENERATION: {
        return await this.pdfService.generateMembershipInvoice(job.data.payload);
      }
      case EJobType.PROCESS_INTERPRETER_BADGE_PDF_GENERATION: {
        return await this.pdfService.generateInterpreterBadge(job.data.payload);
      }
      case EJobType.PROCESS_DEPOSIT_CHARGE_PDF_GENERATION: {
        return await this.pdfService.generateDepositCharge(job.data.payload);
      }
      case EJobType.PROCESS_CORPORATE_PAYOUT_RECEIPT_PDF_GENERATION: {
        return await this.pdfService.generateCorporatePayOutReceipt(job.data.payload);
      }
      case EJobType.PROCESS_CORPORATE_TAX_INVOICE_RECEIPT_PDF_GENERATION: {
        return await this.pdfService.generateCorporateTaxInvoiceReceipt(job.data.payload);
      }
      case EJobType.PROCESS_CORPORATE_POST_PAYMENT_RECEIPT_PDF_GENERATION: {
        return await this.pdfService.generateCorporatePostPaymentReceipt(job.data.payload);
      }
      default:
        return this.handleUnknownJob(job);
    }
  }

  private async handleNotificationsJob(job: Job<IQueueJobType>): Promise<void> {
    switch (job.data.jobName) {
      case EJobType.PROCESS_NOTIFY_MEMBERSHIP_CHANGES: {
        const { membership, membershipAssignment, notificationType, membershipPricingRegion } = job.data.payload;

        return await this.membershipsService.processNotifyMembershipChanges(
          membership,
          membershipAssignment,
          notificationType,
          membershipPricingRegion,
        );
      }
      default:
        return this.handleUnknownJob(job);
    }
  }

  private async handleAppointmentsJob(job: Job<IQueueJobType>): Promise<void> {
    switch (job.data.jobName) {
      case EJobType.PROCESS_CLOSE_MEETING: {
        const { chimeMeetingId } = job.data.payload;

        return await this.meetingClosingService.closeMeeting(chimeMeetingId);
      }

      case EJobType.PROCESS_CLOSE_MEETING_WITHOUT_CLIENT_VISIT: {
        const { appointment } = job.data.payload;

        return await this.meetingClosingService.closeMeetingsWithoutClientVisit(appointment);
      }

      case EJobType.PROCESS_CHECK_IN_OUT_APPOINTMENT: {
        const { appointmentId, dto, user } = job.data.payload;

        return await this.appointmentExternalSessionService.checkInOutAppointment(appointmentId, dto, user);
      }

      default:
        return this.handleUnknownJob(job);
    }
  }

  private async handleWebhooksJob(job: Job<IQueueJobType>): Promise<void> {
    switch (job.data.jobName) {
      case EJobType.PROCESS_SUMSUB_WEBHOOK: {
        const { message } = job.data.payload;

        return await this.webhookSumSubService.processSumSubWebhook(message);
      }
      case EJobType.PROCESS_DOCUSIGN_WEBHOOK: {
        const { message } = job.data.payload;

        return await this.webhookDocusignService.processDocusignWebhook(message);
      }
      case EJobType.PROCESS_STRIPE_WEBHOOK: {
        const { message } = job.data.payload;

        return await this.webhookStripeService.processStripeWebhook(message);
      }
      default:
        return this.handleUnknownJob(job);
    }
  }

  private async handleDefaultJob(job: Job): Promise<void> {
    switch (job.name) {
      default:
        return this.handleUnknownJob(job);
    }
  }

  private async handleUnknownJob(job: Job): Promise<void> {
    this.lokiLogger.error(`Received unknown job: #${job.id}, name:[${job.name}], data: ${JSON.stringify(job.data)}`);
  }
}
