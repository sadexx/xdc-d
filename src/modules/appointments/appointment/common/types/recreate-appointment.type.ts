import { Appointment, AppointmentAdminInfo, AppointmentReminder } from "src/modules/appointments/appointment/entities";
import { UserRole } from "src/modules/users/entities";
import { Role } from "src/modules/users/entities";
import { User, UserProfile } from "src/modules/users/entities";
import { MultiWayParticipant } from "src/modules/multi-way-participant/entities";
import { Address } from "src/modules/addresses/entities";
import { ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { AppointmentOrder, AppointmentOrderGroup } from "src/modules/appointment-orders/appointment-order/entities";

export type TRecreateAppointment = TAppointment & {
  client?: TClient | null;
  participants?: TParticipants[];
  address?: TAddress;
  appointmentReminder?: TAppointmentReminder;
  chimeMeetingConfiguration?: TChimeMeetingConfiguration;
  appointmentOrder?: TAppointmentOrder;
  appointmentAdminInfo: TAppointmentAdminInfo | null;
};

type TAppointment = Pick<Appointment, TAppointmentKeys>;
type TAppointmentKeys =
  | "id"
  | "scheduledStartTime"
  | "schedulingDurationMin"
  | "communicationType"
  | "schedulingType"
  | "topic"
  | "preferredInterpreterGender"
  | "interpreterType"
  | "interpretingType"
  | "simultaneousInterpretingType"
  | "languageFrom"
  | "languageTo"
  | "participantType"
  | "alternativePlatform"
  | "alternativeVideoConferencingPlatformLink"
  | "notes"
  | "schedulingExtraDay"
  | "isGroupAppointment"
  | "appointmentsGroupId"
  | "sameInterpreter"
  | "acceptOvertimeRates"
  | "interpreterId";

type TClient = Pick<UserRole, TClientKeys> & {
  role: TClientRole;
  profile: TClientProfile;
  user: TClientUser;
};
type TClientKeys =
  | "id"
  | "timezone"
  | "operatedByCompanyName"
  | "operatedByCompanyId"
  | "operatedByMainCorporateCompanyName"
  | "operatedByMainCorporateCompanyId";

type TClientRole = Pick<Role, TClientRoleKeys>;
type TClientRoleKeys = "id" | "name";

type TClientProfile = Pick<UserProfile, TClientProfileKeys>;
type TClientProfileKeys = "id" | "firstName" | "lastName" | "contactEmail" | "dateOfBirth";

type TClientUser = Pick<User, TClientUserKeys>;
type TClientUserKeys = "id" | "platformId" | "phoneNumber";

type TParticipants = Pick<MultiWayParticipant, TParticipantsKeys>;
type TParticipantsKeys = "id" | "name" | "age" | "phoneCode" | "phoneNumber" | "email";

type TAddress = Pick<Address, TAddressKeys>;
type TAddressKeys =
  | "id"
  | "latitude"
  | "longitude"
  | "country"
  | "state"
  | "suburb"
  | "streetName"
  | "streetNumber"
  | "postcode"
  | "building"
  | "unit"
  | "timezone";

type TAppointmentReminder = Pick<AppointmentReminder, "id">;

type TChimeMeetingConfiguration = Pick<ChimeMeetingConfiguration, "id">;

type TAppointmentOrder = Pick<AppointmentOrder, "id"> & {
  appointmentOrderGroup?: TAppointmentOrderGroup;
};

type TAppointmentOrderGroup = Pick<AppointmentOrderGroup, "id"> & {
  appointmentOrders: TAppointmentOrder[];
};

type TAppointmentAdminInfo = Pick<AppointmentAdminInfo, TAppointmentAdminInfoKeys>;
type TAppointmentAdminInfoKeys = "id" | "isRedFlagEnabled";
