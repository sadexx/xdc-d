import { IRoundData } from "src/modules/statistics/common/interfaces";

export interface IChartRoundDataOutput {
  all: number;
  onDemand: number;
  preBooked: number;
  chart: IRoundData[];
}
