import { Appointment } from "src/modules/appointments/appointment/entities";
import {
  EExternalVideoResolution,
  EExtMeetingFeatureStatus,
  EExtVideoContentResolution,
} from "src/modules/chime-meeting-configuration/common/enums";

export interface ICreateMeetingConfig {
  appointment: Appointment;
  meetingScheduledStartTime: Date;
  echoReduction: EExtMeetingFeatureStatus;
  maxVideoResolution: EExternalVideoResolution;
  maxContentResolution: EExtVideoContentResolution;
  maxAttendees: number;
}
