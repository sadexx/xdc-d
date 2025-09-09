import { ValuesOf } from "src/common/types";

export const EChartLine = {
  ACTIVE_USERS: "activeUser",
  REGISTERED_USERS: "registeredUser",
  INACTIVE_ACCOUNTS: "inactiveAccount",
  UNSUCCESSFUL_REGISTRATION: "unsuccessfulRegistration",
  NEW_USER_REGISTRATION: "newUserRegistration",
  ACTIVE_INTERPRETERS: "activeInterpreters",
  INTERPRETER_NOT_FOUND: "interpreterNotFound",
  DELETED_ACCOUNTS: "deletedAccounts",
  ACCEPTED_APPOINTMENTS: "acceptedAppointments",
  REJECTED_APPOINTMENTS: "rejectedAppointments",
  CREATED_APPOINTMENTS: "createdAppointments",
  COMPLETED_APPOINTMENTS: "completedAppointments",
  APPOINTMENTS_DURATION: "appointmentsDuration",
  APPOINTMENTS_BY_WOMEN: "appointmentsByWomen",
  APPOINTMENTS_BY_MEN: "appointmentsByMen",
  APPOINTMENTS_BY_OTHERS: "appointmentsByOthers",
  CANCELLED_APPOINTMENTS: "cancelledAppointments",
  UNANSWERED_ON_DEMAND_APPOINTMENTS: "unansweredOnDemandAppointments",
  APPOINTMENTS_WITHOUT_INTERPRETER: "appointmentsWithoutInterpreter",
  ACTIVE_MEMBERSHIPS: "activeMemberships",
} as const;

export type EChartLine = ValuesOf<typeof EChartLine>;
