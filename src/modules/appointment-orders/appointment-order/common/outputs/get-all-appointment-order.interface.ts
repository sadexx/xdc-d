import { AppointmentOrder, AppointmentOrderGroup } from "src/modules/appointment-orders/appointment-order/entities";

export interface IAllTypeAppointmentOrdersOutput {
  appointmentOrders: AppointmentOrder[];
  appointmentOrdersGroups: AppointmentOrderGroup[];
}
