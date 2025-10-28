import { User, UserProfile, UserRole } from "src/modules/users/entities";

/**
 ** Types
 */

export type TSendClientCanceledAppointmentNotification = Pick<UserRole, "id"> & {
  user: Pick<User, "email">;
  profile: Pick<UserProfile, "preferredName" | "firstName" | "lastName">;
};
