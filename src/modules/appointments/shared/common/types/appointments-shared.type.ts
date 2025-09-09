import {
  EAppointmentCommunicationType,
  EAppointmentInterpreterType,
  EAppointmentInterpretingType,
  EAppointmentSchedulingType,
  EAppointmentTopic,
} from "src/modules/appointments/appointment/common/enums";
import { Appointment, AppointmentAdminInfo } from "src/modules/appointments/appointment/entities";
import { Attendee, ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { MultiWayParticipant } from "src/modules/multi-way-participant/entities";
import { UserRole } from "src/modules/users/entities";

/**
 ** Type
 */

export type TAppointmentForInvitation = Pick<
  Appointment,
  | "id"
  | "platformId"
  | "scheduledStartTime"
  | "schedulingDurationMin"
  | "participantType"
  | "topic"
  | "languageFrom"
  | "languageTo"
  | "alternativePlatform"
  | "alternativeVideoConferencingPlatformLink"
>;
export type TClientForInvitation = Pick<UserRole, "id"> & {
  profile: Pick<UserRole["profile"], "firstName" | "lastName" | "preferredName">;
};

export type TParticipantForInvitation = Pick<MultiWayParticipant, "id" | "email" | "phoneCode" | "phoneNumber">;

export type TAttendeeForInvitation = Pick<Attendee, "id" | "externalUserId" | "joinUrl" | "guestPhoneNumber">;

type ServiceCombination<
  T extends EAppointmentInterpreterType,
  S extends EAppointmentSchedulingType,
  C extends EAppointmentCommunicationType,
  I extends EAppointmentInterpretingType,
  Topic extends EAppointmentTopic = never,
> = [Topic] extends [never] ? `${T}:${S}:${C}:${I}` : `${T}:${S}:${C}:${I}:${Topic}`;

type ProfessionalInterpreterCombination =
  | ServiceCombination<"ind-professional-interpreter", "on-demand", "audio", "consecutive">
  | ServiceCombination<"ind-professional-interpreter", "on-demand", "video", "consecutive">
  | ServiceCombination<"ind-professional-interpreter", "pre-booked", "audio", "consecutive">
  | ServiceCombination<"ind-professional-interpreter", "pre-booked", "video", "consecutive">
  | ServiceCombination<"ind-professional-interpreter", "on-demand", "face-to-face", "consecutive">
  | ServiceCombination<"ind-professional-interpreter", "pre-booked", "face-to-face", "consecutive">
  | ServiceCombination<"ind-professional-interpreter", "pre-booked", "face-to-face", "sign-language">
  | ServiceCombination<"ind-professional-interpreter", "on-demand", "face-to-face", "sign-language">
  | ServiceCombination<"ind-professional-interpreter", "pre-booked", "video", "sign-language">
  | ServiceCombination<"ind-professional-interpreter", "on-demand", "video", "sign-language">
  | ServiceCombination<"ind-professional-interpreter", "pre-booked", "face-to-face", "simultaneous">
  | ServiceCombination<"ind-professional-interpreter", "pre-booked", "face-to-face", "escort">;

type LanguageBuddyInterpreterCombination =
  | ServiceCombination<"ind-language-buddy-interpreter", "on-demand", "audio", "consecutive", "general">
  | ServiceCombination<"ind-language-buddy-interpreter", "on-demand", "video", "consecutive", "general">
  | ServiceCombination<"ind-language-buddy-interpreter", "pre-booked", "audio", "consecutive", "general">
  | ServiceCombination<"ind-language-buddy-interpreter", "pre-booked", "video", "consecutive", "general">
  | ServiceCombination<"ind-language-buddy-interpreter", "on-demand", "face-to-face", "consecutive", "general">
  | ServiceCombination<"ind-language-buddy-interpreter", "pre-booked", "face-to-face", "consecutive", "general">;

export type ValidServiceCombination = ProfessionalInterpreterCombination | LanguageBuddyInterpreterCombination;

export type TIsAppointmentCancellationRestrictedByTimeLimits = Pick<
  Appointment,
  "status" | "scheduledStartTime" | "creationDate" | "communicationType"
>;

export type TDisableRedFlag = Pick<Appointment, "id"> & {
  appointmentAdminInfo: Pick<AppointmentAdminInfo, "id"> | null;
};

export type TDeleteChimeMeetingWithAttendees = Pick<ChimeMeetingConfiguration, "id">;
