import { TLiveAppointmentCache } from "src/modules/appointments/appointment/common/types";

export interface ILiveAppointmentCacheData {
  appointment: TLiveAppointmentCache;
  isEndingSoonPushSent: boolean;
  extensionPeriodStart?: Date;
}
