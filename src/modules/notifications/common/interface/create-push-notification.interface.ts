import { ENotificationType } from "src/modules/notifications/common/enum";
import { INotificationData } from "src/modules/notifications/common/interface";
import { TGetSessionForNotification } from "src/modules/notifications/common/types";

export interface ICreatePushNotification {
  userDevices: TGetSessionForNotification[];
  title: ENotificationType;
  message: string;
  notificationData: INotificationData;
}
