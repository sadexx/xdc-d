import { EChartLine } from "src/modules/statistics/common/enums";
import { ILineData } from "src/modules/statistics/common/interfaces";

export interface IChartLineDataOutput {
  [EChartLine.ACTIVE_USERS]?: ILineData;
  [EChartLine.REGISTERED_USERS]?: ILineData;
  [EChartLine.INACTIVE_ACCOUNTS]?: ILineData;
  [EChartLine.UNSUCCESSFUL_REGISTRATION]?: ILineData;
  [EChartLine.NEW_USER_REGISTRATION]?: ILineData;
  [EChartLine.ACTIVE_INTERPRETERS]?: ILineData;
  [EChartLine.INTERPRETER_NOT_FOUND]?: ILineData;
  [EChartLine.DELETED_ACCOUNTS]?: ILineData;
  [EChartLine.ACCEPTED_APPOINTMENTS]?: ILineData;
  [EChartLine.REJECTED_APPOINTMENTS]?: ILineData;
  [EChartLine.CREATED_APPOINTMENTS]?: ILineData;
  [EChartLine.COMPLETED_APPOINTMENTS]?: ILineData;
  [EChartLine.APPOINTMENTS_DURATION]?: ILineData;
  [EChartLine.APPOINTMENTS_BY_WOMEN]?: ILineData;
  [EChartLine.APPOINTMENTS_BY_MEN]?: ILineData;
  [EChartLine.APPOINTMENTS_BY_OTHERS]?: ILineData;
  [EChartLine.CANCELLED_APPOINTMENTS]?: ILineData;
  [EChartLine.UNANSWERED_ON_DEMAND_APPOINTMENTS]?: ILineData;
  [EChartLine.APPOINTMENTS_WITHOUT_INTERPRETER]?: ILineData;
  [EChartLine.ACTIVE_MEMBERSHIPS]?: ILineData;
}
