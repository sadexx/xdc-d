import { AppointmentOrder, AppointmentOrderGroup } from "src/modules/appointment-orders/appointment-order/entities";
import { Appointment, AppointmentAdminInfo } from "src/modules/appointments/appointment/entities";
import { UserRole } from "src/modules/users/entities";
import { Role } from "src/modules/users/entities";
import { UserProfile } from "src/modules/users/entities";

export type TAcceptAppointmentOrder = TAppointmentOrder & {
  appointment: TAppointment;
  appointmentOrderGroup?: TOrderGroup;
};

export type TAcceptAppointmentOrderGroup = TAppointmentOrderGroup & {
  appointmentOrders: TAcceptAppointmentOrder[];
};

type TAppointmentOrder = Pick<AppointmentOrder, TAppointmentOrderKeys>;
type TAppointmentOrderKeys = "id" | "schedulingType" | "platformId" | "matchedInterpreterIds";

type TAppointmentOrderGroup = Pick<AppointmentOrderGroup, TAppointmentOrderGroupKeys>;
type TAppointmentOrderGroupKeys = "id" | "platformId";

type TAppointment = Pick<Appointment, TAppointmentKeys> & {
  client: TClient;
  appointmentAdminInfo?: TAppointmentAdminInfo;
};
type TAppointmentKeys =
  | "id"
  | "clientId"
  | "scheduledStartTime"
  | "scheduledEndTime"
  | "appointmentsGroupId"
  | "platformId"
  | "communicationType"
  | "alternativePlatform"
  | "languageFrom"
  | "languageTo"
  | "topic"
  | "schedulingDurationMin";

type TClient = Pick<UserRole, TClientKeys> & {
  role: TClientRole;
  profile: TClientProfile;
};
type TClientKeys =
  | "id"
  | "instanceUserArn"
  | "operatedByCompanyName"
  | "operatedByCompanyId"
  | "operatedByMainCorporateCompanyName"
  | "operatedByMainCorporateCompanyId";

type TClientRole = Pick<Role, TClientRoleKeys>;
type TClientRoleKeys = "id" | "name";

type TClientProfile = Pick<UserProfile, TClientProfileKeys>;
type TClientProfileKeys = "id" | "firstName" | "lastName";

type TAppointmentAdminInfo = Pick<AppointmentAdminInfo, TAppointmentAdminInfoKeys>;
type TAppointmentAdminInfoKeys = "id" | "isRedFlagEnabled";

type TOrderGroup = Pick<AppointmentOrderGroup, TOrderGroupKeys>;
type TOrderGroupKeys = "id" | "sameInterpreter";
