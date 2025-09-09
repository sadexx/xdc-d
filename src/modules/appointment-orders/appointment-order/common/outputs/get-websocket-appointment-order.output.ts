import { Exclude } from "class-transformer";
import { AppointmentOrder } from "src/modules/appointment-orders/appointment-order/entities";

export class GetWebsocketAppointmentOrderOutput extends AppointmentOrder {
  @Exclude()
  declare matchedInterpreterIds: string[];

  @Exclude()
  declare rejectedInterpreterIds: string[];
}
