import { Appointment, AppointmentAdminInfo, AppointmentReminder } from "src/modules/appointments/appointment/entities";
import { UserRole } from "src/modules/users/entities";
import { User, UserProfile } from "src/modules/users/entities";
import { Role } from "src/modules/users/entities";
import { ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { AppointmentOrder, AppointmentOrderGroup } from "src/modules/appointment-orders/appointment-order/entities";
import { Address } from "src/modules/addresses/entities";
import { MultiWayParticipant } from "src/modules/multi-way-participant/entities";

export type TCancelAppointment = TAppointment & {
  client?: TClient | null;
  interpreter?: TInterpreter | null;
  appointmentReminder: TAppointmentReminder;
  chimeMeetingConfiguration?: TChimeMeetingConfiguration;
  appointmentAdminInfo: TAppointmentAdminInfo | null;
  appointmentOrder?: TAppointmentOrder;
  address?: TAddress;
  participants?: TParticipant[];
};

type TAppointment = Pick<Appointment, TAppointmentKeys>;
type TAppointmentKeys =
  | "id"
  | "status"
  | "communicationType"
  | "clientId"
  | "interpreterId"
  | "isGroupAppointment"
  | "sameInterpreter"
  | "appointmentsGroupId"
  | "platformId"
  | "creationDate"
  | "scheduledStartTime"
  | "scheduledEndTime"
  | "schedulingType"
  | "schedulingDurationMin"
  | "topic"
  | "preferredInterpreterGender"
  | "interpreterType"
  | "interpretingType"
  | "languageFrom"
  | "languageTo"
  | "participantType"
  | "acceptOvertimeRates"
  | "timezone";

type TClient = Pick<UserRole, TClientKeys> & {
  user: TClientUser;
  profile: TClientProfile;
  role: TClientRole;
};
type TClientKeys =
  | "id"
  | "operatedByCompanyName"
  | "operatedByCompanyId"
  | "operatedByMainCorporateCompanyName"
  | "operatedByMainCorporateCompanyId";

type TClientUser = Pick<User, TClientUserKeys>;
type TClientUserKeys = "id" | "platformId" | "email";

type TClientProfile = Pick<UserProfile, TClientProfileKeys>;
type TClientProfileKeys = "id" | "preferredName" | "firstName" | "lastName";

type TClientRole = Pick<Role, TClientRoleKeys>;
type TClientRoleKeys = "id" | "name";

type TInterpreter = Pick<UserRole, "id"> & {
  user: TInterpreterUser;
  profile: TInterpreterProfile;
  role: TInterpreterRole;
};

type TInterpreterUser = Pick<User, TInterpreterUserKeys>;
type TInterpreterUserKeys = "id" | "platformId" | "email";

type TInterpreterProfile = Pick<UserProfile, TInterpreterProfileKeys>;
type TInterpreterProfileKeys = "id" | "preferredName" | "firstName" | "lastName";

type TInterpreterRole = Pick<Role, TInterpreterRoleKeys>;
type TInterpreterRoleKeys = "id" | "name";

type TAppointmentReminder = Pick<AppointmentReminder, "id">;

type TChimeMeetingConfiguration = Pick<ChimeMeetingConfiguration, TChimeMeetingConfigurationKeys>;
type TChimeMeetingConfigurationKeys = "id" | "maxAttendees";

type TAppointmentAdminInfo = Pick<AppointmentAdminInfo, TAppointmentAdminInfoKeys>;
type TAppointmentAdminInfoKeys = "id" | "isRedFlagEnabled";

type TAppointmentOrder = Pick<AppointmentOrder, "id"> & {
  appointmentOrderGroup?: TAppointmentOrderGroup;
};

type TAppointmentOrderGroup = Pick<AppointmentOrderGroup, "id"> & {
  appointmentOrders: TAppointmentOrder[];
};

type TAddress = Pick<Address, TAppointmentAddressKeys>;
type TAppointmentAddressKeys =
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

type TParticipant = Pick<MultiWayParticipant, TParticipantKeys>;
type TParticipantKeys = "id" | "email" | "phoneCode" | "phoneNumber";
