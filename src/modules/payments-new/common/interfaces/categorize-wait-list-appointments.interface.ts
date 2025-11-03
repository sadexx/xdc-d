import { TCheckPaymentWaitList } from "src/modules/payments-new/common/types";

export interface ICategorizeWaitListAppointments {
  oldAppointments: TCheckPaymentWaitList["appointment"][];
  processableAppointments: TCheckPaymentWaitList["appointment"][];
}
