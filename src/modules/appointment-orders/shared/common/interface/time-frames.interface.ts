import { ERepeatInterval } from "src/modules/appointment-orders/appointment-order/common/enum";

export interface ITimeFrames {
  nextRepeatTime: Date | null;
  repeatInterval: ERepeatInterval;
  remainingRepeats: number;
  notifyAdmin: Date;
  endSearchTime: Date;
}

export interface ITimeFrame {
  nextRepeatTime: Date | null;
  repeatInterval: ERepeatInterval;
  remainingRepeats: number;
}
