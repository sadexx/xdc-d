import { IListInterpreters } from "src/modules/appointment-orders/appointment-order/common/interface";

export interface IResultListInterpreters {
  result: { data: IListInterpreters[] | null; total: number };
}
