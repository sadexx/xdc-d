import { PaginationCursorOutput } from "src/common/outputs";
import { TGetAllNotifications } from "src/modules/notifications/common/types";

export interface GetAllNotificationsOutput extends PaginationCursorOutput {
  data: TGetAllNotifications[];
}
