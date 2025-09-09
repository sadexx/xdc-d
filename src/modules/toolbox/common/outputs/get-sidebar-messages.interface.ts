import { IUnreadChannelMessagesOutput } from "src/modules/toolbox/common/outputs/unread-channel-messages.interface";

export interface IGetSidebarMessagesOutput {
  hasNewCompanyRequests: boolean;
  hasAppointmentOrders: boolean;
  hasUnreadChannelMessages: IUnreadChannelMessagesOutput | boolean;
  hasUnreadNotifications: boolean;
}
