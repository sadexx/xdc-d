import { AppointmentOrder } from "src/modules/appointment-orders/appointment-order/entities";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { UserRole } from "src/modules/users/entities";
import { InterpreterProfile } from "src/modules/interpreters/profile/entities";

/**
 ** Type
 */

export type TCancelOnDemandCallsAppointmentOrder = Pick<
  AppointmentOrder,
  "id" | "platformId" | "matchedInterpreterIds"
> & {
  appointment: Pick<Appointment, "id">;
};

export type TCheckIfInterpreterIsBlocked = Pick<UserRole, "id"> & {
  interpreterProfile: Pick<InterpreterProfile, "isTemporaryBlocked"> | null;
};
