import { AppointmentOrderGroup } from "src/modules/appointment-orders/appointment-order/entities";

export interface IAppointmentOrderGroupByIdOutput extends Omit<AppointmentOrderGroup, "beforeInsert"> {
  isRejected: boolean;
}
