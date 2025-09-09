import { EExtMediaCapabilities } from "src/modules/chime-meeting-configuration/common/enums";
import { EUserRoleName } from "src/modules/users/common/enums";
import { TMeetingConfigForConstructAttendee } from "src/modules/chime-meeting-configuration/common/types";

export interface ICreateAttendee {
  chimeMeetingConfiguration: TMeetingConfigForConstructAttendee;
  externalUserId: string;
  roleName: EUserRoleName;
  attendeeId?: string;
  isOnline: boolean;
  isAnonymousGuest: boolean;
  joinUrl: string;
  guestPhoneNumber: string | null;
  joinToken?: string;
  audioCapabilities: EExtMediaCapabilities;
  videoCapabilities: EExtMediaCapabilities;
  contentCapabilities: EExtMediaCapabilities;
}
