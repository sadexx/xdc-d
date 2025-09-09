import { AppointmentOrder } from "src/modules/appointment-orders/appointment-order/entities";

export interface IAppointmentOrderByIdOutput extends Omit<AppointmentOrder, "beforeInsert"> {
  isRejected: boolean;
}
