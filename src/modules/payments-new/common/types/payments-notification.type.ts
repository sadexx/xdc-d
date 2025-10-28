import { Appointment } from "src/modules/appointments/appointment/entities";
import { UserProfile, UserRole } from "src/modules/users/entities";
import { Company } from "src/modules/companies/entities";

/**
 ** Type
 */

export type TSendAuthorizationPaymentNotification = Pick<Appointment, "id" | "platformId"> & {
  client: Pick<UserRole, "id">;
};

export type TSendDepositLowBalanceNotificationCompany = Pick<Company, "contactEmail" | "platformId">;

export type TSendDepositLowBalanceNotificationSuperAdmin = Pick<UserRole, "id"> & {
  profile: Pick<UserProfile, "preferredName" | "firstName">;
};
