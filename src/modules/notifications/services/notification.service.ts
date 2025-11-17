import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, LessThan, Repository } from "typeorm";
import { Notification } from "src/modules/notifications/entities";
import {
  ENotificationDataType,
  ENotificationPlatformType,
  ENotificationType,
  ENotificationUserTarget,
} from "src/modules/notifications/common/enum";
import { ESortOrder } from "src/common/enums";
import { GetAllNotificationsDto } from "src/modules/notifications/common/dto";
import { GetAllNotificationsOutput, ICompanyDetailsOutput } from "src/modules/notifications/common/outputs";
import { INotificationData } from "src/modules/notifications/common/interface";
import { NotificationDeliveryService } from "src/modules/notifications/services";
import { LokiLogger } from "src/common/logger";
import { ICancelOnDemandInvitationOutput } from "src/modules/appointment-orders/appointment-order/common/outputs";
import { IAppointmentDetailsOutput } from "src/modules/appointments/appointment/common/outputs";
import { IDraftAppointmentDetailsOutput } from "src/modules/draft-appointments/common/outputs";
import { IChatMessageOutput } from "src/modules/chime-messaging-configuration/common/outputs";
import {
  IAppointmentOrderInvitationOutput,
  IOnDemandInvitationOutput,
  ISearchConditionsOutput,
} from "src/modules/search-engine-logic/common/outputs";
import {
  DeleteNotificationByIdQuery,
  GetAllNotificationsQuery,
  TDeleteNotificationById,
  TGetAllNotifications,
} from "src/modules/notifications/common/types";
import { findManyTyped, findOneOrFailTyped } from "src/common/utils";
import { EPaymentFailedReason } from "src/modules/payments/common/enums/core";

@Injectable()
export class NotificationService {
  private readonly lokiLogger = new LokiLogger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly notificationDeliveryService: NotificationDeliveryService,
  ) {}

  public async getAll(id: string, dto: GetAllNotificationsDto): Promise<GetAllNotificationsOutput> {
    const whereConditions: FindOptionsWhere<Notification> = {
      userRoleId: id,
    };

    if (dto.cursor) {
      whereConditions.creationDate = LessThan(dto.cursor);
    }

    const notifications = await findManyTyped<TGetAllNotifications[]>(this.notificationRepository, {
      select: GetAllNotificationsQuery.select,
      where: whereConditions,
      order: { creationDate: ESortOrder.DESC },
      take: dto.limit,
    });

    const nextCursor = notifications.length === dto.limit ? notifications[notifications.length - 1].creationDate : null;

    this.markAllNotificationsAsViewed(id).catch((error: Error) => {
      this.lokiLogger.error(`Failed to mark all notifications as viewed for userRoleId: ${id}`, error.stack);
    });

    return { data: notifications, nextCursor };
  }

  public async deleteById(id: string, userRoleId: string): Promise<void> {
    const notification = await findOneOrFailTyped<TDeleteNotificationById>(id, this.notificationRepository, {
      select: DeleteNotificationByIdQuery.select,
      where: { id: id, userRoleId: userRoleId },
    });
    await this.notificationRepository.delete({ id: notification.id });
  }

  public async deleteOldNotifications(): Promise<void> {
    const DAYS = 14;
    const twoWeeksAgo = new Date();

    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - DAYS);

    const result = await this.notificationRepository.delete({
      creationDate: LessThan(twoWeeksAgo),
    });

    this.lokiLogger.log(`Deleted ${result.affected} notifications older than ${DAYS} days.`);
  }

  private async markAllNotificationsAsViewed(userRoleId: string): Promise<void> {
    await this.notificationRepository.update({ userRoleId }, { isViewed: true });
  }

  public async sendAlertNotification(userRoleId: string): Promise<void> {
    const title = ENotificationType.ALERT;
    const message = `Alert Message`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.TEXT_INFO },
      platformTypes: ENotificationPlatformType.ALL_PLATFORMS,
      userTarget: ENotificationUserTarget.ALL_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendBackyCheckVerificationNotification(userRoleId: string): Promise<void> {
    const title = ENotificationType.VERIFICATION;
    const message = `Your Working with Children Check documents have been verified.`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.WWCC_VERIFICATION },
      platformTypes: ENotificationPlatformType.ALL_PLATFORMS,
      userTarget: ENotificationUserTarget.ALL_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendBackyCheckErrorNotification(userRoleId: string): Promise<void> {
    const title = ENotificationType.VERIFICATION;
    const message = `Your Working with Children Check documents have been rejected.`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.WWCC_VERIFICATION },
      platformTypes: ENotificationPlatformType.ALL_PLATFORMS,
      userTarget: ENotificationUserTarget.ALL_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendRightToWorkCheckVerificationNotification(userRoleId: string): Promise<void> {
    const title = ENotificationType.VERIFICATION;
    const message = `Your documents for the Right to work as a Professional Interpreter have been verified.`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.RIGHT_TO_WORK_VERIFICATION },
      platformTypes: ENotificationPlatformType.MOBILE_PLATFORMS,
      userTarget: ENotificationUserTarget.ALL_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendRightToWorkCheckErrorNotification(userRoleId: string): Promise<void> {
    const title = ENotificationType.VERIFICATION;
    const message = `Your documents for the Right to work as a Professional Interpreter have been rejected.`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.RIGHT_TO_WORK_VERIFICATION },
      platformTypes: ENotificationPlatformType.MOBILE_PLATFORMS,
      userTarget: ENotificationUserTarget.ALL_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendLanguageDocCheckVerificationNotification(userRoleId: string): Promise<void> {
    const title = ENotificationType.VERIFICATION;
    const message = `Your language documents have been successfully verified.`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.LANGUAGE_DOCS_VERIFICATION },
      platformTypes: ENotificationPlatformType.MOBILE_PLATFORMS,
      userTarget: ENotificationUserTarget.ALL_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendLanguageDocCheckErrorNotification(userRoleId: string): Promise<void> {
    const title = ENotificationType.VERIFICATION;
    const message = `Your language documents have been rejected.`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.LANGUAGE_DOCS_VERIFICATION },
      platformTypes: ENotificationPlatformType.MOBILE_PLATFORMS,
      userTarget: ENotificationUserTarget.ALL_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendConcessionCardCheckVerificationNotification(userRoleId: string): Promise<void> {
    const title = ENotificationType.VERIFICATION;
    const message = `You have been successfully verified by Concession card.`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.CONCESSION_CARD_VERIFICATION },
      platformTypes: ENotificationPlatformType.MOBILE_PLATFORMS,
      userTarget: ENotificationUserTarget.ALL_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendConcessionCardCheckErrorNotification(userRoleId: string): Promise<void> {
    const title = ENotificationType.VERIFICATION;
    const message = `Concession card verification failed.`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.CONCESSION_CARD_VERIFICATION },
      platformTypes: ENotificationPlatformType.MOBILE_PLATFORMS,
      userTarget: ENotificationUserTarget.ALL_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendAccountActivationNotification(userRoleId: string): Promise<void> {
    const title = ENotificationType.ACTIVATION;
    const message = `Your account has been activated.`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.ACCOUNT_ACTIVATION },
      platformTypes: ENotificationPlatformType.ALL_PLATFORMS,
      userTarget: ENotificationUserTarget.ALL_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendAccountDeactivationNotification(userRoleId: string): Promise<void> {
    const title = ENotificationType.DEACTIVATION;
    const message = `Your account has been deactivated.`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.ACCOUNT_DEACTIVATION },
      platformTypes: ENotificationPlatformType.ALL_PLATFORMS,
      userTarget: ENotificationUserTarget.ALL_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendNoExpertiseMatchNotification(
    userRoleId: string,
    platformId: string,
    searchConditions: ISearchConditionsOutput,
  ): Promise<void> {
    const title = ENotificationType.SEARCH;
    const message = `Oops! No interpreters fit within your chosen Area of Expertise for appointment with id: ${platformId}. Would you like to select the General Area of Expertise instead?`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.SEARCH_ENGINE, extraData: searchConditions },
      platformTypes: ENotificationPlatformType.ALL_PLATFORMS,
      userTarget: ENotificationUserTarget.ACTIVE_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendExperienceGenderMismatchNotification(
    userRoleId: string,
    platformId: string,
    searchConditions: ISearchConditionsOutput,
  ): Promise<void> {
    const title = ENotificationType.SEARCH;
    const message = `Oops! No interpreters match your selected Area of Experience and Gender for appointment with id: ${platformId}. Want to refine your search criteria?`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.SEARCH_ENGINE, extraData: searchConditions },
      platformTypes: ENotificationPlatformType.ALL_PLATFORMS,
      userTarget: ENotificationUserTarget.ACTIVE_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendGenderMismatchNotification(
    userRoleId: string,
    platformId: string,
    searchConditions: ISearchConditionsOutput,
  ): Promise<void> {
    const title = ENotificationType.SEARCH;
    const message = `Unfortunately, we don't have an available interpreter matching the chosen gender for appointment with id: ${platformId}. Would you like to refine your search criteria for gender?`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.SEARCH_ENGINE, extraData: searchConditions },
      platformTypes: ENotificationPlatformType.ALL_PLATFORMS,
      userTarget: ENotificationUserTarget.ACTIVE_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendNewOnDemandInvitationForAppointmentNotification(
    userRoleId: string,
    platformId: string,
    onDemandInvitation: IOnDemandInvitationOutput,
  ): Promise<void> {
    const title = ENotificationType.INCOMING_CALL;
    const message = `Your have a new invitation for on-demand order with id: ${platformId}.`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.ON_DEMAND_INVITATION, extraData: onDemandInvitation },
      platformTypes: ENotificationPlatformType.CALLING_PLATFORMS,
      userTarget: ENotificationUserTarget.ACTIVE_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendCancelOnDemandInvitationForAppointmentNotification(
    userRoleId: string,
    platformId: string,
    cancelOnDemandInvitation: ICancelOnDemandInvitationOutput,
  ): Promise<void> {
    const title = ENotificationType.INCOMING_CALL;
    const message = `Your on-demand invitation has been canceled for order with id: ${platformId}.`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.CANCEL_ON_DEMAND_INVITATION, extraData: cancelOnDemandInvitation },
      platformTypes: ENotificationPlatformType.SILENT_CALLING_PLATFORMS,
      userTarget: ENotificationUserTarget.ACTIVE_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendNewInvitationForAppointmentNotification(
    userRoleId: string,
    platformId: string,
    appointmentOrderInvitation: IAppointmentOrderInvitationOutput,
  ): Promise<void> {
    const title = ENotificationType.INVITATION;
    const message = `Your have a new invitation for appointment with id: ${platformId}.`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.APPOINTMENT_ORDER_INVITATION, extraData: appointmentOrderInvitation },
      platformTypes: ENotificationPlatformType.ALL_PLATFORMS,
      userTarget: ENotificationUserTarget.ACTIVE_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendNewInvitationForAppointmentsNotification(
    userRoleId: string,
    platformId: string,
    appointmentOrderInvitation: IAppointmentOrderInvitationOutput,
  ): Promise<void> {
    const title = ENotificationType.GROUP_INVITATION;
    const message = `Your have a new invitation for group appointment with id: ${platformId}.`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.APPOINTMENT_ORDER_INVITATION, extraData: appointmentOrderInvitation },
      platformTypes: ENotificationPlatformType.ALL_PLATFORMS,
      userTarget: ENotificationUserTarget.ACTIVE_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendRepeatInvitationForAppointmentNotification(
    userRoleId: string,
    platformId: string,
    appointmentOrderInvitation: IAppointmentOrderInvitationOutput,
  ): Promise<void> {
    const title = ENotificationType.REPEAT_INVITATION;
    const message = `Your have a repeat invitation for appointment with id: ${platformId}.`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.APPOINTMENT_ORDER_INVITATION, extraData: appointmentOrderInvitation },
      platformTypes: ENotificationPlatformType.MOBILE_PLATFORMS,
      userTarget: ENotificationUserTarget.ACTIVE_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendRepeatInvitationForAppointmentsNotification(
    userRoleId: string,
    platformId: string,
    appointmentOrderInvitation: IAppointmentOrderInvitationOutput,
  ): Promise<void> {
    const title = ENotificationType.REPEAT_GROUP_INVITATION;
    const message = `Your have a repeat invitation for group appointment with id: ${platformId}.`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.APPOINTMENT_ORDER_INVITATION, extraData: appointmentOrderInvitation },
      platformTypes: ENotificationPlatformType.MOBILE_PLATFORMS,
      userTarget: ENotificationUserTarget.ACTIVE_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendDraftAppointmentConfirmationNotification(
    userRoleId: string,
    platformId: string,
    draftAppointmentDetails: IDraftAppointmentDetailsOutput,
  ): Promise<void> {
    const title = ENotificationType.CONFIRMATION;
    const message = `The new Appointment with id: ${platformId} has been created by the Booking Officer. Please confirm the appointment.`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.DRAFT_APPOINTMENT_DETAILS, extraData: draftAppointmentDetails },
      platformTypes: ENotificationPlatformType.ALL_PLATFORMS,
      userTarget: ENotificationUserTarget.ACTIVE_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendAcceptedAppointmentNotification(
    userRoleId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetailsOutput,
  ): Promise<void> {
    const title = ENotificationType.ACCEPTED;
    const message = `Your appointment with id: ${platformId}, has been accepted.`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.APPOINTMENT_DETAILS, extraData: appointmentDetails },
      platformTypes: ENotificationPlatformType.ALL_PLATFORMS,
      userTarget: ENotificationUserTarget.ACTIVE_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendAcceptedGroupAppointmentNotification(
    userRoleId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetailsOutput,
  ): Promise<void> {
    const title = ENotificationType.GROUP_ACCEPTED;
    const message = `Your group appointment with id: ${platformId}, has been accepted.`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.APPOINTMENT_DETAILS, extraData: appointmentDetails },
      platformTypes: ENotificationPlatformType.ALL_PLATFORMS,
      userTarget: ENotificationUserTarget.ACTIVE_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendRedFlagForAppointmentNotification(
    userRoleId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetailsOutput,
  ): Promise<void> {
    const title = ENotificationType.RED_FLAG;
    const message = `Appointment with id: ${platformId}, has been flagged for red flag and requires your attention.`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.RED_FLAG_DETAILS, extraData: appointmentDetails },
      platformTypes: ENotificationPlatformType.WEB_ONLY,
      userTarget: ENotificationUserTarget.ACTIVE_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendRedFlagForAppointmentsNotification(
    userRoleId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetailsOutput,
  ): Promise<void> {
    const title = ENotificationType.GROUP_RED_FLAG;
    const message = `Group appointment with id: ${platformId}, has been flagged for red flag and requires your attention.`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.RED_FLAG_DETAILS, extraData: appointmentDetails },
      platformTypes: ENotificationPlatformType.WEB_ONLY,
      userTarget: ENotificationUserTarget.ACTIVE_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendClientCanceledAppointmentNotification(
    userRoleId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetailsOutput,
  ): Promise<void> {
    const title = ENotificationType.CANCELLATION;
    const message = `Your accepted appointment with id: ${platformId}, has been canceled.`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.APPOINTMENT_DETAILS, extraData: appointmentDetails },
      platformTypes: ENotificationPlatformType.ALL_PLATFORMS,
      userTarget: ENotificationUserTarget.ACTIVE_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendClientCanceledAppointmentsNotification(
    userRoleId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetailsOutput,
  ): Promise<void> {
    const title = ENotificationType.GROUP_CANCELLATION;
    const message = `Your accepted appointments with group id: ${platformId}, have been canceled.`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.APPOINTMENT_DETAILS, extraData: appointmentDetails },
      platformTypes: ENotificationPlatformType.ALL_PLATFORMS,
      userTarget: ENotificationUserTarget.ACTIVE_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendAdminCanceledAppointmentNotification(
    userRoleId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetailsOutput,
  ): Promise<void> {
    const title = ENotificationType.CANCELLATION;
    const message = `Your scheduled appointment with id: ${platformId}, has been canceled.`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.APPOINTMENT_DETAILS, extraData: appointmentDetails },
      platformTypes: ENotificationPlatformType.ALL_PLATFORMS,
      userTarget: ENotificationUserTarget.ACTIVE_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendAdminCanceledAppointmentsNotification(
    userRoleId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetailsOutput,
  ): Promise<void> {
    const title = ENotificationType.GROUP_CANCELLATION;
    const message = `Your scheduled appointments with id: ${platformId}, have been canceled.`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.APPOINTMENT_DETAILS, extraData: appointmentDetails },
      platformTypes: ENotificationPlatformType.ALL_PLATFORMS,
      userTarget: ENotificationUserTarget.ACTIVE_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendClientChangedAppointmentNotification(
    userRoleId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetailsOutput,
  ): Promise<void> {
    const title = ENotificationType.ALERT;
    const message = `Your accepted appointment with id: ${platformId}, has been changed.`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.APPOINTMENT_DETAILS, extraData: appointmentDetails },
      platformTypes: ENotificationPlatformType.ALL_PLATFORMS,
      userTarget: ENotificationUserTarget.ACTIVE_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendReminderForAppointmentInTwoMinutesNotification(
    userRoleId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetailsOutput,
  ): Promise<void> {
    const title = ENotificationType.REMINDER;
    const message = `Your scheduled appointment with id: ${platformId} will start in 2 minutes.`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.APPOINTMENT_DETAILS, extraData: appointmentDetails },
      platformTypes: ENotificationPlatformType.ALL_PLATFORMS,
      userTarget: ENotificationUserTarget.ACTIVE_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendReminderForAppointmentInTenMinutesNotification(
    userRoleId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetailsOutput,
  ): Promise<void> {
    const title = ENotificationType.REMINDER;
    const message = `Your scheduled appointment with id: ${platformId} will start in 10 minutes.`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.APPOINTMENT_DETAILS, extraData: appointmentDetails },
      platformTypes: ENotificationPlatformType.ALL_PLATFORMS,
      userTarget: ENotificationUserTarget.ACTIVE_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendReminderForAppointmentInTwoHoursNotification(
    userRoleId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetailsOutput,
  ): Promise<void> {
    const title = ENotificationType.REMINDER;
    const message = `Your scheduled appointment with id: ${platformId} will start in 2 hours.`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.APPOINTMENT_DETAILS, extraData: appointmentDetails },
      platformTypes: ENotificationPlatformType.ALL_PLATFORMS,
      userTarget: ENotificationUserTarget.ACTIVE_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendReminderForAppointmentInTwentyFourHoursNotification(
    userRoleId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetailsOutput,
  ): Promise<void> {
    const title = ENotificationType.REMINDER;
    const message = `Your scheduled appointment with id: ${platformId} will start in 24 hours.`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.APPOINTMENT_DETAILS, extraData: appointmentDetails },
      platformTypes: ENotificationPlatformType.ALL_PLATFORMS,
      userTarget: ENotificationUserTarget.ACTIVE_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendAvatarVerifiedNotification(userRoleId: string): Promise<void> {
    const title = ENotificationType.VERIFIED;
    const message = `Your avatar has been successfully verified.`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.AVATAR_VERIFICATION },
      platformTypes: ENotificationPlatformType.ALL_PLATFORMS,
      userTarget: ENotificationUserTarget.ALL_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendAvatarDeclinedNotification(userRoleId: string, declineReason: string): Promise<void> {
    const title = ENotificationType.DECLINED;
    const message = `Your avatar has been declined. ${declineReason}`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.AVATAR_VERIFICATION },
      platformTypes: ENotificationPlatformType.ALL_PLATFORMS,
      userTarget: ENotificationUserTarget.ALL_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendInterpreterLateNotification(
    userRoleId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetailsOutput,
  ): Promise<void> {
    const title = ENotificationType.ALERT;
    const message = `Your appointment (ID ${platformId}) is now live! Are you running late? Please notify the client if there is a delay.`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.APPOINTMENT_DETAILS, extraData: appointmentDetails },
      platformTypes: ENotificationPlatformType.ALL_PLATFORMS,
      userTarget: ENotificationUserTarget.ACTIVE_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendClientLateNotification(
    userRoleId: string,
    lateMinutes: number,
    appointmentDetails: IAppointmentDetailsOutput,
  ): Promise<void> {
    const title = ENotificationType.INTERPRETER_LATE;
    const message = `The interpreter is running ${lateMinutes} minutes late.`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.APPOINTMENT_DETAILS, extraData: appointmentDetails },
      platformTypes: ENotificationPlatformType.ALL_PLATFORMS,
      userTarget: ENotificationUserTarget.ACTIVE_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendChannelMessageNotification(
    userRoleId: string,
    platformId: string,
    chatMessage: IChatMessageOutput,
  ): Promise<void> {
    const title = ENotificationType.NEW_MESSAGE;
    const message = `You have a new messages in chat with id: ${platformId}.`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.CHAT_MESSAGE, extraData: chatMessage },
      platformTypes: ENotificationPlatformType.ALL_PLATFORMS,
      userTarget: ENotificationUserTarget.ALL_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendClientRatingNotification(
    userRoleId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetailsOutput,
  ): Promise<void> {
    const title = ENotificationType.RATE_INTERPRETER;
    const message = `Your appointment with id: ${platformId} is completed. Please, rate the interpreter.`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.APPOINTMENT_DETAILS, extraData: appointmentDetails },
      platformTypes: ENotificationPlatformType.ALL_PLATFORMS,
      userTarget: ENotificationUserTarget.ACTIVE_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendInterpreterRatingNotification(
    userRoleId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetailsOutput,
  ): Promise<void> {
    const title = ENotificationType.RATE_CALL;
    const message = `Your appointment with id: ${platformId} is completed. Please, rate the call.`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.APPOINTMENT_DETAILS, extraData: appointmentDetails },
      platformTypes: ENotificationPlatformType.ALL_PLATFORMS,
      userTarget: ENotificationUserTarget.ACTIVE_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendAppointmentAuthorizationPaymentSucceededNotification(
    userRoleId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetailsOutput,
  ): Promise<void> {
    const title = ENotificationType.PRE_AUTHORIZATION_SUCCEEDED;
    const message = `The pre-authorization for your appointment (ID: ${platformId}) has been successfully processed.`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.APPOINTMENT_PAYMENT_SUCCEEDED, extraData: appointmentDetails },
      platformTypes: ENotificationPlatformType.ALL_PLATFORMS,
      userTarget: ENotificationUserTarget.ACTIVE_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendAppointmentAuthorizationPaymentFailedNotification(
    userRoleId: string,
    platformId: string,
    reason: EPaymentFailedReason,
    appointmentDetails: IAppointmentDetailsOutput,
  ): Promise<void> {
    const title = ENotificationType.PRE_AUTHORIZATION_FAILED;
    const message = `The pre-authorization for your appointment (ID: ${platformId}) has failed. Reason: ${reason}`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.APPOINTMENT_PAYMENT_FAILED, extraData: appointmentDetails },
      platformTypes: ENotificationPlatformType.ALL_PLATFORMS,
      userTarget: ENotificationUserTarget.ACTIVE_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendIncorrectPaymentInformationNotification(userRoleId: string): Promise<void> {
    const title = ENotificationType.INCORRECT_PAYMENT_INFORMATION;
    const message = `Please update your payment information.`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.INCORRECT_PAYMENT_INFORMATION, extraData: { userRoleId } },
      platformTypes: ENotificationPlatformType.ALL_PLATFORMS,
      userTarget: ENotificationUserTarget.ALL_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendDepositChargeSucceededNotification(
    userRoleId: string,
    platformId: string,
    depositChargeDetails: ICompanyDetailsOutput,
  ): Promise<void> {
    const title = ENotificationType.DEPOSIT_CHARGE_SUCCEEDED;
    const message = `Your deposit charge for company with id: ${platformId} was successful.`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.DEPOSIT_CHARGE_SUCCEEDED, extraData: depositChargeDetails },
      platformTypes: ENotificationPlatformType.ALL_PLATFORMS,
      userTarget: ENotificationUserTarget.ACTIVE_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }

  public async sendDepositChargeFailedNotification(
    userRoleId: string,
    platformId: string,
    reason: EPaymentFailedReason,
    depositChargeDetails: ICompanyDetailsOutput,
  ): Promise<void> {
    const title = ENotificationType.DEPOSIT_CHARGE_FAILED;
    const message = `Your deposit charge for company with id: ${platformId} was failed. Reason: ${reason}`;
    const data: INotificationData = {
      data: { type: ENotificationDataType.DEPOSIT_CHARGE_FAILED, extraData: depositChargeDetails },
      platformTypes: ENotificationPlatformType.ALL_PLATFORMS,
      userTarget: ENotificationUserTarget.ACTIVE_USERS,
    };
    await this.notificationDeliveryService.handleSendNotification(userRoleId, title, message, data);
  }
}
