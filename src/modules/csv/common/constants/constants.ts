import {
  IAppointmentsCsv,
  ICompaniesCsv,
  IDraftAppointmentsCsv,
  IEmployeesCsv,
  IUsersCsv,
} from "src/modules/csv/common/interfaces/csv-data";

export const appointmentCsvDataMapping = {
  platformId: "Number",
  status: "Status",
  interpreterType: "Interpreter Type",
  schedulingType: "Scheduling Type",
  communicationType: "Communication Type",
  scheduledStartTime: "Scheduled Start Time",
  scheduledEndTime: "Scheduled End Time",
  schedulingDurationMin: "Scheduling Duration Min",
  interpreterFullName: "Interpreter Full Name",
  interpreterRole: "Interpreter Role",
  clientFullName: "Client Full Name",
  languageFrom: "Language From",
  languageTo: "Language To",
  topic: "Topic",
  creationDate: "Creation Date",
  paidByClient: "Paid by Client",
  clientCurrency: "Client Currency",
  receivedByInterpreter: "Received by Interpreter",
  interpreterCurrency: "Interpreter Currency",
  appointmentCallRating: "Rating of the Call quality",
  interpreterRating: "Rating of the Interpreter",
  promoCampaignDiscount: "Promo code Discount",
  membershipDiscount: "Membership Discount",
  promoCampaignDiscountMinutes: "Promo code Discount Minutes",
  membershipFreeMinutes: "Membership Free Minutes",
  promoCode: "Promo code",
  membershipType: "Membership type",
  notes: "Admin Notes",
} as const satisfies Record<keyof IAppointmentsCsv, string>;

export const draftAppointmentCsvDataMapping = {
  platformId: "Number",
  status: "Status",
  interpreterType: "Interpreter Type",
  schedulingType: "Scheduling Type",
  communicationType: "Communication Type",
  scheduledStartTime: "Scheduled Start Time",
  schedulingDurationMin: "Scheduling Duration Min",
  clientFullName: "Client Full Name",
  languageFrom: "Language From",
  languageTo: "Language To",
  topic: "Topic",
  creationDate: "Creation Date",
} as const satisfies Record<keyof IDraftAppointmentsCsv, string>;

export const usersCsvDataMapping = {
  fullName: "Name",
  accountStatus: "Account Status",
  role: "User Role",
  phoneNumber: "Phone Number",
  email: "Email",
  gender: "Gender",
  knownLanguages: "Known Languages",
  country: "Country",
  state: "State",
  city: "City",
} as const satisfies Record<keyof IUsersCsv, string>;

export const companiesCsvDataMapping = {
  name: "Company Name",
  status: "Status",
  country: "Country",
  platformId: "Company ID",
  phoneNumber: "Phone Number",
  contactEmail: "Admin Email",
  activitySphere: "Industry",
  employeesNumber: "Employees",
} as const satisfies Record<keyof ICompaniesCsv, string>;

export const employeesCsvDataMapping = {
  fullName: "Name",
  accountStatus: "Account Status",
  role: "User Role",
  phoneNumber: "Phone Number",
  email: "Email",
  city: "City",
} as const satisfies Record<keyof IEmployeesCsv, string>;
