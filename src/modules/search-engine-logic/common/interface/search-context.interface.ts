import { AppointmentOrder, AppointmentOrderGroup } from "src/modules/appointment-orders/appointment-order/entities";
import { InterpreterProfile } from "src/modules/interpreters/profile/entities";
import { SelectQueryBuilder } from "typeorm";
import { EAppointmentSchedulingType } from "src/modules/appointments/appointment/common/enums";

export interface ISearchContextBase {
  cacheKey: string;
  query: SelectQueryBuilder<InterpreterProfile>;
  order: AppointmentOrder;
  orderType: EAppointmentSchedulingType;
  sendNotifications: boolean;
  setRedFlags: boolean;
  isFirstSearchCompleted: boolean;
  isSecondSearchCompleted: boolean;
  isSearchNeeded: boolean;
  isCompanyHasInterpreters: boolean;
  timeToRestart: Date | null;
  isOrderSaved: boolean;
}

export interface IGroupSearchContext extends ISearchContextBase {
  group: AppointmentOrderGroup;
}
