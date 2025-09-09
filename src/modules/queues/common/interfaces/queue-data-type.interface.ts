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

export interface IProcessStripeUpdateSubscriptionPriceData {
  jobName: EJobType.PROCESS_STRIPE_UPDATE_SUBSCRIPTIONS_PRICE;
  payload: { customerId: string; newPriceId: string };
}

export interface IProcessSumSubWebhookData {
  jobName: EJobType.PROCESS_SUMSUB_WEBHOOK;
  payload: { message: Message };
}

export interface IProcessDocusignWebhookData {
  jobName: EJobType.PROCESS_DOCUSIGN_WEBHOOK;
  payload: { message: Message };
}

export interface IProcessStripeWebhookData {
  jobName: EJobType.PROCESS_STRIPE_WEBHOOK;
  payload: { message: Message };
}

export interface IProcessCloseMeetingData {
  jobName: EJobType.PROCESS_CLOSE_MEETING;
  payload: { chimeMeetingId: string };
}

export interface IProcessCloseMeetingWithoutClientVisitData {
  jobName: EJobType.PROCESS_CLOSE_MEETING_WITHOUT_CLIENT_VISIT;
  payload: { appointment: TAppointmentsWithoutClientVisit };
}

export interface IProcessCheckInOutAppointmentData {
  jobName: EJobType.PROCESS_CHECK_IN_OUT_APPOINTMENT;
  payload: { appointmentId: string; dto: CheckInOutAppointmentDto; user: ITokenUserData };
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
  | IProcessCheckInOutAppointmentData;
