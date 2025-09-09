import { ILineData } from "src/modules/statistics/common/interfaces";
import { EMembershipType } from "src/modules/memberships/common/enums";

export interface IChartActiveMembershipsLineDataOutput {
  [EMembershipType.BRONZE]: ILineData;
  [EMembershipType.SILVER]: ILineData;
  [EMembershipType.GOLD]: ILineData;
}
