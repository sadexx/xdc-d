import { IMeeting, IMeetingAttendee } from "src/modules/chime-meeting-configuration/common/interfaces";

export interface IJoinMeetingOutput {
  Meeting: IMeeting;
  Attendee: IMeetingAttendee;
}
