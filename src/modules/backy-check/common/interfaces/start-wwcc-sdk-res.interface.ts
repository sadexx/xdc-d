import { EExtBackyCheckResultResponse } from "src/modules/backy-check/common/enums";

export interface IStartWWCCRes {
  result: {
    responseDetails: string;
    response: EExtBackyCheckResultResponse;
  };
  orderDetails?: {
    orderID: string;
    orderStatus: string;
  };
}
