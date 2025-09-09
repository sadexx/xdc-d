import { Exclude } from "class-transformer";
import { AppointmentOrderGroup } from "src/modules/appointment-orders/appointment-order/entities";

export class GetWebsocketAppointmentOrderGroupOutput extends AppointmentOrderGroup {
  @Exclude()
  declare matchedInterpreterIds: string[];

  @Exclude()
  declare rejectedInterpreterIds: string[];
}
