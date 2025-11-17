import { FindOptionsSelect, FindOptionsRelations } from "typeorm";
import { QueryResultType } from "src/common/types";
import { IncomingPaymentWaitList } from "src/modules/payments/entities";

/**
 ** Query types
 */

export const CheckPaymentWaitListQuery = {
  select: {
    id: true,
    isShortTimeSlot: true,
    paymentAttemptCount: true,
    updatingDate: true,
    appointment: { id: true, scheduledStartTime: true },
  } as const satisfies FindOptionsSelect<IncomingPaymentWaitList>,
  relations: { appointment: true } as const satisfies FindOptionsRelations<IncomingPaymentWaitList>,
};
export type TCheckPaymentWaitList = QueryResultType<IncomingPaymentWaitList, typeof CheckPaymentWaitListQuery.select>;
