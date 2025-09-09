import { FindOptionsSelect } from "typeorm";
import { QueryResultType } from "src/common/types";
import { Notification } from "src/modules/notifications/entities";

/**
 ** Query types
 */

export const GetAllNotificationsQuery = {
  select: {
    id: true,
    title: true,
    message: true,
    extraData: true,
    isViewed: true,
    creationDate: true,
  } as const satisfies FindOptionsSelect<Notification>,
};
export type TGetAllNotifications = QueryResultType<Notification, typeof GetAllNotificationsQuery.select>;

export const DeleteNotificationByIdQuery = {
  select: {
    id: true,
  } as const satisfies FindOptionsSelect<Notification>,
};
export type TDeleteNotificationById = QueryResultType<Notification, typeof DeleteNotificationByIdQuery.select>;
