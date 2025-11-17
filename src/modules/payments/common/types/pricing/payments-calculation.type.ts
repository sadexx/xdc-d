import { NonNullableProperties } from "src/common/types";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { UserRole } from "src/modules/users/entities";
import { AbnCheck } from "src/modules/abn/entities";

/**
 ** Type
 */

export type TCalculatePaymentPriceAppointment = Pick<
  Appointment,
  | "id"
  | "platformId"
  | "schedulingDurationMin"
  | "topic"
  | "communicationType"
  | "schedulingType"
  | "interpreterType"
  | "interpretingType"
  | "businessStartTime"
  | "scheduledEndTime"
  | "scheduledStartTime"
  | "businessEndTime"
  | "acceptOvertimeRates"
  | "timezone"
> & {
  client: NonNullableProperties<Pick<UserRole, "id" | "operatedByCompanyId" | "timezone">, "timezone">;
  interpreter:
    | (Pick<UserRole, "timezone"> & {
        abnCheck: Pick<AbnCheck, "gstFromClient"> | null;
      })
    | null;
};
