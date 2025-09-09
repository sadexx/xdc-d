import { EUserRoleName } from "src/modules/users/common/enums";
import { EExtMediaCapabilities } from "src/modules/chime-meeting-configuration/common/enums";

export interface IMeetingAttendee {
  id: string;
  externalUserId: string;
  roleName: EUserRoleName;
  attendeeId: string;
  isOnline: boolean;
  isAnonymousGuest: boolean;
  joinUrl: string;
  guestPhoneNumber: string | null;
  joinToken: string;
  audioCapabilities: EExtMediaCapabilities;
  videoCapabilities: EExtMediaCapabilities;
  contentCapabilities: EExtMediaCapabilities;
}
