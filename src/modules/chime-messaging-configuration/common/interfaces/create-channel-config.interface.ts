import { EChannelStatus, EChannelType } from "src/modules/chime-messaging-configuration/common/enums";

export interface ICreateChannelConfig {
  type: EChannelType;
  status: EChannelStatus;
  appointmentId?: string | null;
  appointmentsGroupId?: string | null;
  appointmentPlatformId?: string | null;
  operatedByCompanyId: string;
}
