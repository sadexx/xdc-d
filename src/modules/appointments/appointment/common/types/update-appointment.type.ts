import { Appointment } from "src/modules/appointments/appointment/entities";
import { ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { User, UserProfile } from "src/modules/users/entities";
import { UserRole } from "src/modules/users/entities";

export type TUpdateAppointment = TAppointment & {
  chimeMeetingConfiguration: TChimeMeetingConfiguration | null;
  interpreter?: TInterpreter | null;
};

type TAppointment = Pick<Appointment, TAppointmentKeys>;
type TAppointmentKeys =
  | "id"
  | "status"
  | "scheduledStartTime"
  | "communicationType"
  | "schedulingDurationMin"
  | "participantType"
  | "topic"
  | "preferredInterpreterGender"
  | "languageFrom"
  | "languageTo"
  | "isGroupAppointment"
  | "sameInterpreter"
  | "appointmentsGroupId"
  | "platformId"
  | "alternativeVideoConferencingPlatformLink"
  | "acceptOvertimeRates"
  | "alternativePlatform";

type TChimeMeetingConfiguration = Pick<ChimeMeetingConfiguration, TChimeMeetingConfigurationKeys>;
type TChimeMeetingConfigurationKeys = "id" | "maxAttendees";

type TInterpreter = Pick<UserRole, "id"> & {
  user: TInterpreterUser;
  profile: TInterpreterProfile;
};

type TInterpreterUser = Pick<User, TInterpreterUserKeys>;
type TInterpreterUserKeys = "id" | "email";

type TInterpreterProfile = Pick<UserProfile, TInterpreterProfileKeys>;
type TInterpreterProfileKeys = "id" | "firstName" | "lastName";
