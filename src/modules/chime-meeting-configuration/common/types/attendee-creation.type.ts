import { Appointment } from "src/modules/appointments/appointment/entities";
import { ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";

/**
 ** Type
 */

export type TMeetingConfigForConstructAttendee = Pick<ChimeMeetingConfiguration, "id" | "appointmentId">;

export type TMeetingConfigForAddAttendee = Pick<ChimeMeetingConfiguration, "id" | "appointmentId" | "maxAttendees"> & {
  appointment: Pick<Appointment, "id" | "communicationType">;
};
