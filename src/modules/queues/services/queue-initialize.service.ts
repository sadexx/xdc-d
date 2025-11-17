import { Injectable } from "@nestjs/common";
import { Message } from "@aws-sdk/client-sqs";
import Stripe from "stripe";
import { QueueManagementService } from "src/modules/queues/services";
import { IQueueData, IQueueDataBulk } from "src/modules/queues/common/interfaces";
import { EJobType, EQueueType } from "src/modules/queues/common/enums";
import { EMembershipNotificationType, EMembershipPricingRegion } from "src/modules/memberships/common/enums";
import { TProcessNotifyMembershipChanges } from "src/modules/memberships/common/types";
import { TAppointmentsWithoutClientVisit } from "src/modules/appointments/appointment/common/types";
import { CheckInOutAppointmentDto } from "src/modules/appointments/appointment/common/dto";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { EPaymentOperation } from "src/modules/payments-analysis/common/enums/core";
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
import { IPaymentAnalysisAdditionalData } from "src/modules/payments-analysis/common/interfaces/core";
import {
  IMakePreAuthorization,
  IMakePreAuthorizationRecreate,
  IMakeAuthorizationCancel,
  IMakeCaptureAndTransfer,
  IMakeTransfer,
} from "src/modules/payments/common/interfaces/core";

@Injectable()
export class QueueInitializeService {
  constructor(private readonly queueManagementService: QueueManagementService) {}

  public async addNotifyUsersAboutMembershipChangesQueue(
    membership: TProcessNotifyMembershipChanges,
    notificationType: EMembershipNotificationType,
    membershipPricingRegion?: EMembershipPricingRegion,
  ): Promise<void> {
    if (!membership.currentMemberships) {
      return;
    }

    const jobData: IQueueDataBulk = {
      queueEnum: EQueueType.NOTIFICATIONS_QUEUE,
      jobItems: membership.currentMemberships.map((membershipAssignment) => ({
        jobName: EJobType.PROCESS_NOTIFY_MEMBERSHIP_CHANGES,
        payload: {
          membership,
          membershipAssignment,
          notificationType,
          membershipPricingRegion,
        },
      })),
    };
    await this.queueManagementService.addBulk(jobData);
  }

  public async addStripeCancelSubscriptionsQueue(subscriptions: Stripe.Subscription[]): Promise<void> {
    const jobData: IQueueDataBulk = {
      queueEnum: EQueueType.PAYMENTS_QUEUE,
      jobItems: subscriptions.map((subscription) => ({
        jobName: EJobType.PROCESS_STRIPE_CANCEL_SUBSCRIPTIONS,
        payload: { subscriptionId: subscription.id },
      })),
    };
    await this.queueManagementService.addBulk(jobData);
  }

  public async addSubscriptionsUpdatePriceQueue(customerIds: string[], newPriceId: string): Promise<void> {
    const jobData: IQueueDataBulk = {
      queueEnum: EQueueType.PAYMENTS_QUEUE,
      jobItems: customerIds.map((customerId) => ({
        jobName: EJobType.PROCESS_STRIPE_UPDATE_SUBSCRIPTIONS_PRICE,
        payload: { customerId, newPriceId },
      })),
    };
    await this.queueManagementService.addBulk(jobData);
  }

  public async addProcessSumSubWebhookQueue(sqsMessages: Message[]): Promise<void> {
    const jobData: IQueueDataBulk = {
      queueEnum: EQueueType.WEBHOOKS_QUEUE,
      jobItems: sqsMessages.map((message) => ({
        jobName: EJobType.PROCESS_SUMSUB_WEBHOOK,
        payload: { message },
      })),
    };
    await this.queueManagementService.addBulk(jobData);
  }

  public async addProcessDocusignWebhookQueue(sqsMessages: Message[]): Promise<void> {
    const jobData: IQueueDataBulk = {
      queueEnum: EQueueType.WEBHOOKS_QUEUE,
      jobItems: sqsMessages.map((message) => ({
        jobName: EJobType.PROCESS_DOCUSIGN_WEBHOOK,
        payload: { message },
      })),
    };
    await this.queueManagementService.addBulk(jobData);
  }

  public async addProcessStripeWebhookQueue(sqsMessages: Message[]): Promise<void> {
    const jobData: IQueueDataBulk = {
      queueEnum: EQueueType.WEBHOOKS_QUEUE,
      jobItems: sqsMessages.map((message) => ({
        jobName: EJobType.PROCESS_STRIPE_WEBHOOK,
        payload: { message },
      })),
    };
    await this.queueManagementService.addBulk(jobData);
  }

  public async addCloseMeetingWithoutClientVisitQueue(appointments: TAppointmentsWithoutClientVisit[]): Promise<void> {
    for (const appointment of appointments) {
      const jobData: IQueueData = {
        queueEnum: EQueueType.APPOINTMENTS_QUEUE,
        jobItem: {
          jobName: EJobType.PROCESS_CLOSE_MEETING_WITHOUT_CLIENT_VISIT,
          payload: { appointment },
        },
      };

      await this.queueManagementService.addJob(jobData, {
        jobId: `close-meeting-without-client-visit:${appointment.id}`,
      });
    }
  }

  public async addCloseMeetingQueue(chimeMeetingId: string): Promise<void> {
    const jobData: IQueueData = {
      queueEnum: EQueueType.APPOINTMENTS_QUEUE,
      jobItem: {
        jobName: EJobType.PROCESS_CLOSE_MEETING,
        payload: { chimeMeetingId },
      },
    };

    await this.queueManagementService.addJob(jobData, { jobId: `close-meeting:${chimeMeetingId}` });
  }

  public async addCheckInOutAppointmentQueue(
    appointmentId: string,
    dto: CheckInOutAppointmentDto,
    user: ITokenUserData,
  ): Promise<void> {
    const jobData: IQueueData = {
      queueEnum: EQueueType.APPOINTMENTS_QUEUE,
      jobItem: {
        jobName: EJobType.PROCESS_CHECK_IN_OUT_APPOINTMENT,
        payload: { appointmentId, dto, user },
      },
    };

    await this.queueManagementService.addJob(jobData, { jobId: `check-in-out-appointment:${appointmentId}` });
  }

  public async addProcessPaymentOperationQueue(
    appointmentId: string,
    operation: EPaymentOperation,
    additionalData: IPaymentAnalysisAdditionalData,
  ): Promise<void> {
    const jobData: IQueueData = {
      queueEnum: EQueueType.PAYMENTS_ANALYSIS_QUEUE,
      jobItem: {
        jobName: EJobType.PROCESS_PAYMENT_OPERATION,
        payload: { appointmentId, operation, additionalData },
      },
    };

    await this.queueManagementService.addJob(jobData, {
      jobId: `payment-operation:${operation}:${appointmentId}`,
    });
  }

  public async addProcessPaymentPreAuthorizationQueue(data: IMakePreAuthorization): Promise<void> {
    const jobData: IQueueData = {
      queueEnum: EQueueType.PAYMENTS_EXECUTION_QUEUE,
      jobItem: {
        jobName: EJobType.PROCESS_PAYMENT_PRE_AUTHORIZATION,
        payload: data,
      },
    };

    await this.queueManagementService.addJob(jobData, {
      jobId: `payment-execution:${EPaymentOperation.AUTHORIZE_PAYMENT}:${data.context.appointment.id}`,
    });
  }

  public async addProcessPaymentPreAuthorizationRecreateQueue(data: IMakePreAuthorizationRecreate): Promise<void> {
    const jobData: IQueueData = {
      queueEnum: EQueueType.PAYMENTS_EXECUTION_QUEUE,
      jobItem: {
        jobName: EJobType.PROCESS_PAYMENT_PRE_AUTHORIZATION_RECREATE,
        payload: data,
      },
    };

    await this.queueManagementService.addJob(jobData, {
      jobId: `payment-execution:${EPaymentOperation.AUTHORIZATION_RECREATE_PAYMENT}:${data.context.appointment.id}`,
    });
  }

  public async addProcessPaymentAuthorizationCancelQueue(data: IMakeAuthorizationCancel): Promise<void> {
    const jobData: IQueueData = {
      queueEnum: EQueueType.PAYMENTS_EXECUTION_QUEUE,
      jobItem: {
        jobName: EJobType.PROCESS_PAYMENT_AUTHORIZATION_CANCEL,
        payload: data,
      },
    };

    await this.queueManagementService.addJob(jobData, {
      jobId: `payment-execution:${EPaymentOperation.AUTHORIZATION_CANCEL_PAYMENT}:${data.context.appointment.id}`,
    });
  }

  public async addProcessPaymentCaptureQueue(data: IMakeCaptureAndTransfer): Promise<void> {
    const jobData: IQueueData = {
      queueEnum: EQueueType.PAYMENTS_EXECUTION_QUEUE,
      jobItem: {
        jobName: EJobType.PROCESS_PAYMENT_CAPTURE,
        payload: data,
      },
    };

    await this.queueManagementService.addJob(jobData, {
      jobId: `payment-execution:${EPaymentOperation.CAPTURE_PAYMENT}:${data.context.appointment.id}`,
    });
  }

  public async addProcessPaymentTransferQueue(data: IMakeTransfer): Promise<void> {
    const jobData: IQueueData = {
      queueEnum: EQueueType.PAYMENTS_EXECUTION_QUEUE,
      jobItem: {
        jobName: EJobType.PROCESS_PAYMENT_TRANSFER,
        payload: data,
      },
    };

    await this.queueManagementService.addJob(jobData, {
      jobId: `payment-execution:${EPaymentOperation.TRANSFER_PAYMENT}:${data.context.appointment.id}`,
    });
  }

  public async addProcessPayInReceiptGenerationQueue(data: IGeneratePayInReceipt): Promise<void> {
    const jobData: IQueueData = {
      queueEnum: EQueueType.PDF_GENERATION_QUEUE,
      jobItem: {
        jobName: EJobType.PROCESS_PAY_IN_RECEIPT_PDF_GENERATION,
        payload: data,
      },
    };

    await this.queueManagementService.addJob(jobData, {
      jobId: `pdf-generation:${EJobType.PROCESS_PAY_IN_RECEIPT_PDF_GENERATION}:${data.appointment.id}`,
    });
  }

  public async addProcessPayOutReceiptGenerationQueue(data: IGeneratePayOutReceipt): Promise<void> {
    const jobData: IQueueData = {
      queueEnum: EQueueType.PDF_GENERATION_QUEUE,
      jobItem: {
        jobName: EJobType.PROCESS_PAY_OUT_RECEIPT_PDF_GENERATION,
        payload: data,
      },
    };

    await this.queueManagementService.addJob(jobData, {
      jobId: `pdf-generation:${EJobType.PROCESS_PAY_OUT_RECEIPT_PDF_GENERATION}:${data.appointment.id}`,
    });
  }

  public async addProcessTaxInvoiceReceiptGenerationQueue(data: IGenerateTaxInvoiceReceipt): Promise<void> {
    const jobData: IQueueData = {
      queueEnum: EQueueType.PDF_GENERATION_QUEUE,
      jobItem: {
        jobName: EJobType.PROCESS_TAX_INVOICE_RECEIPT_PDF_GENERATION,
        payload: data,
      },
    };

    await this.queueManagementService.addJob(jobData, {
      jobId: `pdf-generation:${EJobType.PROCESS_TAX_INVOICE_RECEIPT_PDF_GENERATION}:${data.appointment.id}`,
    });
  }

  public async addProcessMembershipInvoiceGenerationQueue(data: IGenerateMembershipInvoice): Promise<void> {
    const jobData: IQueueData = {
      queueEnum: EQueueType.PDF_GENERATION_QUEUE,
      jobItem: {
        jobName: EJobType.PROCESS_MEMBERSHIP_INVOICE_PDF_GENERATION,
        payload: data,
      },
    };

    await this.queueManagementService.addJob(jobData, {
      jobId: `pdf-generation:${EJobType.PROCESS_MEMBERSHIP_INVOICE_PDF_GENERATION}:${data.payment.id}`,
    });
  }

  public async addProcessInterpreterBadgeGenerationQueue(data: IGenerateInterpreterBadge): Promise<void> {
    const jobData: IQueueData = {
      queueEnum: EQueueType.PDF_GENERATION_QUEUE,
      jobItem: {
        jobName: EJobType.PROCESS_INTERPRETER_BADGE_PDF_GENERATION,
        payload: data,
      },
    };

    await this.queueManagementService.addJob(jobData, {
      jobId: `pdf-generation:${EJobType.PROCESS_INTERPRETER_BADGE_PDF_GENERATION}:${data.userRole.id}`,
    });
  }

  public async addProcessDepositChargeGenerationQueue(payment: TWebhookPaymentIntentSucceededPayment): Promise<void> {
    const jobData: IQueueData = {
      queueEnum: EQueueType.PDF_GENERATION_QUEUE,
      jobItem: {
        jobName: EJobType.PROCESS_DEPOSIT_CHARGE_PDF_GENERATION,
        payload: payment,
      },
    };

    await this.queueManagementService.addJob(jobData, {
      jobId: `pdf-generation:${EJobType.PROCESS_DEPOSIT_CHARGE_PDF_GENERATION}:${payment.id}`,
    });
  }

  public async addProcessCorporatePayOutReceiptGenerationQueue(data: IGenerateCorporatePayOutReceipt): Promise<void> {
    const jobData: IQueueData = {
      queueEnum: EQueueType.PDF_GENERATION_QUEUE,
      jobItem: {
        jobName: EJobType.PROCESS_CORPORATE_PAYOUT_RECEIPT_PDF_GENERATION,
        payload: data,
      },
    };

    await this.queueManagementService.addJob(jobData, {
      jobId: `pdf-generation:${EJobType.PROCESS_CORPORATE_PAYOUT_RECEIPT_PDF_GENERATION}:${data.company.id}`,
    });
  }

  public async addProcessCorporateTaxInvoiceReceiptGenerationQueue(
    data: IGenerateCorporateTaxInvoiceReceipt,
  ): Promise<void> {
    const jobData: IQueueData = {
      queueEnum: EQueueType.PDF_GENERATION_QUEUE,
      jobItem: {
        jobName: EJobType.PROCESS_CORPORATE_TAX_INVOICE_RECEIPT_PDF_GENERATION,
        payload: data,
      },
    };

    await this.queueManagementService.addJob(jobData, {
      jobId: `pdf-generation:${EJobType.PROCESS_CORPORATE_TAX_INVOICE_RECEIPT_PDF_GENERATION}:${data.company.id}`,
    });
  }
}
