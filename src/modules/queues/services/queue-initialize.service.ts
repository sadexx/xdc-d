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
}
