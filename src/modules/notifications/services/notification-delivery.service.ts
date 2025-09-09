import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Action, ChannelType, MessageRequest } from "@aws-sdk/client-pinpoint";
import { Repository } from "typeorm";
import { Notification } from "src/modules/notifications/entities";
import { AwsPinpointService } from "src/modules/aws/pinpoint/services";
import { ENVIRONMENT, NUMBER_OF_SECONDS_IN_MINUTE } from "src/common/constants";
import { EEnvironment } from "src/common/enums";
import {
  ENotificationDataType,
  ENotificationPlatformType,
  ENotificationType,
  ENotificationUserTarget,
} from "src/modules/notifications/common/enum";
import { Session } from "src/modules/sessions/entities";
import {
  ICreatePushNotification,
  INotificationData,
  NotificationData,
} from "src/modules/notifications/common/interface";
import { EPlatformType } from "src/modules/sessions/common/enum";
import { LokiLogger } from "src/common/logger";
import { findManyTyped } from "src/common/utils";
import { GetSessionForNotificationQuery, TGetSessionForNotification } from "src/modules/notifications/common/types";

@Injectable()
export class NotificationDeliveryService {
  private readonly lokiLogger = new LokiLogger(NotificationDeliveryService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(Session)
    private readonly sessionsRepository: Repository<Session>,
    private readonly awsPinpointService: AwsPinpointService,
  ) {}

  public async handleSendNotification(
    userRoleId: string,
    title: ENotificationType,
    message: string,
    notificationData: INotificationData,
  ): Promise<void> {
    const userDevices = await this.getUserUniqueDevicesForPlatforms(userRoleId, notificationData);

    const pushNotifications = await this.createPushNotifications({ userDevices, title, message, notificationData });

    await this.saveNotification(userRoleId, title, message, notificationData);

    if (pushNotifications.length > 0) {
      if (ENVIRONMENT === EEnvironment.LOCAL) {
        this.lokiLogger.log(`Push Notifications: ${JSON.stringify(pushNotifications)}`);
      } else {
        await this.sendPushNotifications(pushNotifications);
      }
    }
  }

  private async getUserUniqueDevicesForPlatforms(
    userRoleId: string,
    notificationData: INotificationData,
  ): Promise<TGetSessionForNotification[]> {
    const sessions = await this.getSessionBasedOnUserTarget(userRoleId, notificationData);

    switch (notificationData.platformTypes) {
      case ENotificationPlatformType.ALL_PLATFORMS:
        return this.getAllPlatformUniqueDevices(sessions);
      case ENotificationPlatformType.CALLING_PLATFORMS:
        return this.getCallPlatformUniqueDevices(sessions);
      case ENotificationPlatformType.SILENT_CALLING_PLATFORMS:
        return this.getAllPlatformUniqueDevices(sessions);
      case ENotificationPlatformType.MOBILE_PLATFORMS:
        return this.getMobilePlatformUniqueDevices(sessions);
      case ENotificationPlatformType.WEB_ONLY:
        return this.getWebPlatformUniqueDevices(sessions);
    }
  }

  private async getSessionBasedOnUserTarget(
    userRoleId: string,
    notificationData: INotificationData,
  ): Promise<TGetSessionForNotification[]> {
    switch (notificationData.userTarget) {
      case ENotificationUserTarget.ALL_USERS:
        return await this.getAllUserSessions(userRoleId);
      case ENotificationUserTarget.ACTIVE_USERS:
        return await this.getActiveUserSessions(userRoleId);
      case ENotificationUserTarget.REGISTERED_USERS:
        return await this.getRegisteredUserSessions(userRoleId);
    }
  }

  private async getAllUserSessions(userRoleId: string): Promise<TGetSessionForNotification[]> {
    return await findManyTyped<TGetSessionForNotification[]>(this.sessionsRepository, {
      select: GetSessionForNotificationQuery.select,
      where: { userRoleId: userRoleId },
    });
  }

  private async getActiveUserSessions(userRoleId: string): Promise<TGetSessionForNotification[]> {
    return await findManyTyped<TGetSessionForNotification[]>(this.sessionsRepository, {
      select: GetSessionForNotificationQuery.select,
      where: { userRoleId: userRoleId, user: { userRoles: { id: userRoleId, isActive: true } } },
    });
  }

  private async getRegisteredUserSessions(userRoleId: string): Promise<TGetSessionForNotification[]> {
    return await findManyTyped<TGetSessionForNotification[]>(this.sessionsRepository, {
      select: GetSessionForNotificationQuery.select,
      where: { userRoleId: userRoleId, user: { userRoles: { id: userRoleId, isRegistrationFinished: true } } },
    });
  }

  private async getAllPlatformUniqueDevices(
    sessions: TGetSessionForNotification[],
  ): Promise<TGetSessionForNotification[]> {
    const uniqueSessionsMap = new Map<string, TGetSessionForNotification>();

    for (const session of sessions) {
      if (session.deviceToken && !uniqueSessionsMap.has(session.deviceToken)) {
        uniqueSessionsMap.set(session.deviceToken, session);
      }
    }

    return [...uniqueSessionsMap.values()];
  }

  private async getCallPlatformUniqueDevices(
    sessions: TGetSessionForNotification[],
  ): Promise<TGetSessionForNotification[]> {
    const uniqueDeviceTokens = new Map<string, TGetSessionForNotification>();
    const uniqueVoipTokens = new Map<string, TGetSessionForNotification>();

    for (const session of sessions) {
      if (session.platform === EPlatformType.IOS) {
        if (session.iosVoipToken && !uniqueVoipTokens.has(session.iosVoipToken)) {
          uniqueVoipTokens.set(session.iosVoipToken, session);
        }
      } else {
        if (session.deviceToken && !uniqueDeviceTokens.has(session.deviceToken)) {
          uniqueDeviceTokens.set(session.deviceToken, session);
        }
      }
    }

    return [...uniqueDeviceTokens.values(), ...uniqueVoipTokens.values()];
  }

  private async getMobilePlatformUniqueDevices(
    sessions: TGetSessionForNotification[],
  ): Promise<TGetSessionForNotification[]> {
    const uniqueSessionsMap = new Map<string, TGetSessionForNotification>();

    for (const session of sessions) {
      if (session.platform === EPlatformType.ANDROID || session.platform === EPlatformType.IOS) {
        if (session.deviceToken && !uniqueSessionsMap.has(session.deviceToken)) {
          uniqueSessionsMap.set(session.deviceToken, session);
        }
      } else {
        continue;
      }
    }

    return [...uniqueSessionsMap.values()];
  }

  private async getWebPlatformUniqueDevices(
    sessions: TGetSessionForNotification[],
  ): Promise<TGetSessionForNotification[]> {
    const uniqueSessionsMap = new Map<string, TGetSessionForNotification>();

    for (const session of sessions) {
      if (session.platform === EPlatformType.WEB) {
        if (session.deviceToken && !uniqueSessionsMap.has(session.deviceToken)) {
          uniqueSessionsMap.set(session.deviceToken, session);
        }
      } else {
        continue;
      }
    }

    return [...uniqueSessionsMap.values()];
  }

  private async createPushNotifications(dto: ICreatePushNotification): Promise<MessageRequest[]> {
    let pushNotifications: MessageRequest[] = [];

    if (dto.notificationData.platformTypes === ENotificationPlatformType.CALLING_PLATFORMS) {
      pushNotifications = await this.createPhoneCallMessage(dto);
    } else if (dto.notificationData.platformTypes === ENotificationPlatformType.SILENT_CALLING_PLATFORMS) {
      pushNotifications = await this.createSilentBackgroundMessage(dto);
    } else {
      pushNotifications = await this.createStandardMessage(dto);
    }

    return pushNotifications;
  }

  private async createStandardMessage(dto: ICreatePushNotification): Promise<MessageRequest[]> {
    const { userDevices, title, message, notificationData } = dto;
    const pushNotifications: MessageRequest[] = [];
    const constructedAdditionalInfo: Record<string, string> = await this.constructAdditionalInfo(notificationData.data);

    for (const session of userDevices) {
      let pushNotification: MessageRequest | undefined;

      if (session.platform === EPlatformType.IOS) {
        pushNotification = await this.constructIosMessage(title, message, session, constructedAdditionalInfo);
      } else {
        pushNotification = await this.constructFireBaseMessage(title, message, session, constructedAdditionalInfo);
      }

      if (pushNotification) {
        pushNotifications.push(pushNotification);
      }
    }

    return pushNotifications;
  }

  private async createPhoneCallMessage(dto: ICreatePushNotification): Promise<MessageRequest[]> {
    const { userDevices, title, message, notificationData } = dto;

    if (!notificationData.data) {
      throw new BadRequestException("InvitationLink is required for phone call notification");
    }

    const constructedAdditionalInfo = await this.constructAdditionalInfo(notificationData.data);

    const pushNotifications: MessageRequest[] = [];
    for (const session of userDevices) {
      let pushNotification: MessageRequest | undefined;

      if (session.platform === EPlatformType.IOS) {
        pushNotification = await this.constructIosPhoneCallMessage(title, message, session, constructedAdditionalInfo);
      } else {
        pushNotification = await this.constructFireBasePhoneCallMessage(
          title,
          message,
          session,
          constructedAdditionalInfo,
        );
      }

      if (pushNotification) {
        pushNotifications.push(pushNotification);
      }
    }

    return pushNotifications;
  }

  private async createSilentBackgroundMessage(dto: ICreatePushNotification): Promise<MessageRequest[]> {
    const { userDevices, title, message, notificationData } = dto;
    const pushNotifications: MessageRequest[] = [];
    const constructedAdditionalInfo: Record<string, string> = await this.constructAdditionalInfo(notificationData.data);

    for (const session of userDevices) {
      let pushNotification: MessageRequest | undefined;

      if (session.platform === EPlatformType.IOS) {
        pushNotification = await this.constructIosSilentBackgroundMessage(session, constructedAdditionalInfo);
      } else {
        pushNotification = await this.constructFireBasePhoneCallMessage(
          title,
          message,
          session,
          constructedAdditionalInfo,
        );
      }

      if (pushNotification) {
        pushNotifications.push(pushNotification);
      }
    }

    return pushNotifications;
  }

  private async constructAdditionalInfo(notificationData: NotificationData): Promise<Record<string, string>> {
    const { type } = notificationData;
    let notificationInfo: Record<string, string> = {};

    switch (type) {
      case ENotificationDataType.TEXT_INFO:
        notificationInfo = {
          type,
        };
        break;

      case ENotificationDataType.WWCC_VERIFICATION:
        notificationInfo = {
          type,
        };
        break;

      case ENotificationDataType.RIGHT_TO_WORK_VERIFICATION:
        notificationInfo = {
          type,
        };
        break;

      case ENotificationDataType.LANGUAGE_DOCS_VERIFICATION:
        notificationInfo = {
          type,
        };
        break;

      case ENotificationDataType.CONCESSION_CARD_VERIFICATION:
        notificationInfo = {
          type,
        };
        break;

      case ENotificationDataType.ACCOUNT_ACTIVATION: {
        notificationInfo = {
          type,
        };
        break;
      }

      case ENotificationDataType.ACCOUNT_DEACTIVATION: {
        notificationInfo = {
          type,
        };
        break;
      }

      case ENotificationDataType.APPOINTMENT_ORDER_INVITATION: {
        const appointmentOrderInvitation = notificationData.extraData;
        notificationInfo = {
          type,
          ...appointmentOrderInvitation,
        };
        break;
      }

      case ENotificationDataType.ON_DEMAND_INVITATION: {
        const onDemandData = notificationData.extraData;
        notificationInfo = {
          type,
          ...onDemandData,
          schedulingDurationMin: String(onDemandData.schedulingDurationMin),
        };
        break;
      }

      case ENotificationDataType.CANCEL_ON_DEMAND_INVITATION: {
        const cancelOnDemandData = notificationData.extraData;
        notificationInfo = {
          type,
          ...cancelOnDemandData,
        };
        break;
      }

      case ENotificationDataType.SEARCH_ENGINE: {
        const searchData = notificationData.extraData;
        notificationInfo = {
          type,
          ...searchData,
        };
        break;
      }

      case ENotificationDataType.DRAFT_APPOINTMENT_DETAILS: {
        const draftAppointmentDetails = notificationData.extraData;
        notificationInfo = {
          type,
          ...draftAppointmentDetails,
        };
        break;
      }

      case ENotificationDataType.APPOINTMENT_DETAILS: {
        const appointmentDetails = notificationData.extraData;
        notificationInfo = {
          type,
          ...appointmentDetails,
        };
        break;
      }

      case ENotificationDataType.RED_FLAG_DETAILS: {
        const redFlagAppointmentDetails = notificationData.extraData;
        notificationInfo = {
          type,
          ...redFlagAppointmentDetails,
        };
        break;
      }

      case ENotificationDataType.AVATAR_VERIFICATION:
        notificationInfo = {
          type,
        };
        break;

      case ENotificationDataType.CHAT_MESSAGE: {
        const chatMessage = notificationData.extraData;
        notificationInfo = {
          type,
          ...chatMessage,
        };
        break;
      }

      case ENotificationDataType.APPOINTMENT_PAYMENT_SUCCEEDED: {
        const appointmentPaymentSucceededData = notificationData.extraData;
        notificationInfo = {
          type,
          ...appointmentPaymentSucceededData,
        };
        break;
      }

      case ENotificationDataType.APPOINTMENT_PAYMENT_FAILED: {
        const appointmentPaymentFailedData = notificationData.extraData;
        notificationInfo = {
          type,
          ...appointmentPaymentFailedData,
        };
        break;
      }

      case ENotificationDataType.INCORRECT_PAYMENT_INFORMATION: {
        const appointmentIncorrectPaymentInformationData = notificationData.extraData;
        notificationInfo = {
          type,
          ...appointmentIncorrectPaymentInformationData,
        };
        break;
      }
    }

    return notificationInfo;
  }

  private async constructIosMessage(
    title: ENotificationType,
    message: string,
    sessionDevice: TGetSessionForNotification,
    notificationInfo: Record<string, string>,
  ): Promise<MessageRequest | undefined> {
    if (!sessionDevice.deviceToken) {
      return;
    }

    return {
      Addresses: {
        [sessionDevice.deviceToken]: {
          ChannelType: ChannelType.APNS,
        },
      },
      MessageConfiguration: {
        APNSMessage: {
          Action: Action.OPEN_APP,
          Body: message,
          Title: title,
          Data: notificationInfo,
        },
      },
    };
  }

  private async constructIosPhoneCallMessage(
    title: ENotificationType,
    message: string,
    sessionDevice: TGetSessionForNotification,
    notificationInfo: Record<string, string>,
  ): Promise<MessageRequest | undefined> {
    if (!sessionDevice.iosVoipToken) {
      return;
    }

    return {
      Addresses: {
        [sessionDevice.iosVoipToken]: {
          ChannelType: ChannelType.APNS_VOIP,
        },
      },
      MessageConfiguration: {
        APNSMessage: {
          APNSPushType: "voip",
          Action: Action.OPEN_APP,
          Body: message,
          Title: title,
          Sound: "default",
          Priority: "10",
          Data: notificationInfo,
        },
      },
    };
  }

  private async constructIosSilentBackgroundMessage(
    sessionDevice: TGetSessionForNotification,
    notificationInfo: Record<string, string>,
  ): Promise<MessageRequest | undefined> {
    if (!sessionDevice.deviceToken) {
      return;
    }

    return {
      Addresses: {
        [sessionDevice.deviceToken]: {
          ChannelType: ChannelType.APNS,
        },
      },
      MessageConfiguration: {
        APNSMessage: {
          SilentPush: true,
          Data: notificationInfo,
          Priority: "5",
        },
      },
    };
  }

  private async constructFireBaseMessage(
    title: ENotificationType,
    message: string,
    sessionDevice: TGetSessionForNotification,
    notificationInfo: Record<string, string>,
  ): Promise<MessageRequest | undefined> {
    if (!sessionDevice.deviceToken) {
      return;
    }

    return {
      Addresses: {
        [sessionDevice.deviceToken]: {
          ChannelType: ChannelType.GCM,
        },
      },
      MessageConfiguration: {
        GCMMessage: {
          Action: Action.OPEN_APP,
          Body: message,
          Title: title,
          Data: notificationInfo,
        },
      },
    };
  }

  private async constructFireBasePhoneCallMessage(
    title: ENotificationType,
    message: string,
    sessionDevice: TGetSessionForNotification,
    notificationInfo: Record<string, string>,
  ): Promise<MessageRequest | undefined> {
    if (!sessionDevice.deviceToken) {
      return;
    }

    return {
      Addresses: {
        [sessionDevice.deviceToken]: {
          ChannelType: ChannelType.GCM,
        },
      },
      MessageConfiguration: {
        GCMMessage: {
          Action: Action.OPEN_APP,
          Body: message,
          Title: title,
          SilentPush: true,
          Data: notificationInfo,
          TimeToLive: NUMBER_OF_SECONDS_IN_MINUTE,
        },
      },
    };
  }

  private async saveNotification(
    userRoleId: string,
    title: ENotificationType,
    message: string,
    notificationData: INotificationData,
  ): Promise<void> {
    const createPushNotificationDto = this.notificationRepository.create({
      userRole: { id: userRoleId },
      title: title as string,
      message: message,
      extraData: notificationData.data,
    });

    await this.notificationRepository.save(createPushNotificationDto);
  }

  private async sendPushNotifications(pushNotifications: MessageRequest[]): Promise<void> {
    for (const pushNotification of pushNotifications) {
      await this.awsPinpointService.sendPushNotification(pushNotification);
    }
  }
}
