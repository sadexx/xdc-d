import { Payment, PaymentItem } from "src/modules/payments/entities";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { User, UserRole } from "src/modules/users/entities";
import { Company } from "src/modules/companies/entities";
import { NonNullableProperties, QueryResultType, StrictOmit } from "src/common/types";
import { FindOptionsSelect, FindOptionsRelations } from "typeorm";

/**
 ** Type
 */

export type TGetUserPayments = NonNullableProperties<
  Pick<
    Payment,
    | "id"
    | "platformId"
    | "totalFullAmount"
    | "totalGstAmount"
    | "currency"
    | "paymentMethodInfo"
    | "receipt"
    | "taxInvoice"
    | "note"
    | "isDepositCharge"
    | "membershipId"
    | "updatingDate"
  >,
  "platformId"
> & {
  appointment: Pick<Appointment, "id" | "platformId" | "scheduledStartTime"> | null;
  fromClient:
    | (Pick<UserRole, "id"> & {
        user: Pick<User, "id" | "platformId">;
      })
    | null;
  company: Pick<Company, "id" | "platformId"> | null;
  items: TGetUserPaymentsItem[];
};

export type TGetUserPaymentsItem = Pick<
  PaymentItem,
  | "id"
  | "amount"
  | "gstAmount"
  | "fullAmount"
  | "currency"
  | "status"
  | "receipt"
  | "note"
  | "creationDate"
  | "updatingDate"
>;

export type TPaymentForStatusChange = StrictOmit<TLoadPaymentForStatusChange, "items"> & {
  items: (StrictOmit<TLoadPaymentForStatusChange["items"][number], "amount" | "gstAmount" | "fullAmount"> & {
    amount: number;
    gstAmount: number;
    fullAmount: number;
  })[];
};

/**
 ** Query types
 */

export const LoadPaymentForStatusChangeQuery = {
  select: {
    id: true,
    items: { id: true, status: true, amount: true, gstAmount: true, fullAmount: true },
    appointment: { id: true },
  } as const satisfies FindOptionsSelect<Payment>,
  relations: { items: true, appointment: true } as const satisfies FindOptionsRelations<Payment>,
};
export type TLoadPaymentForStatusChange = QueryResultType<Payment, typeof LoadPaymentForStatusChangeQuery.select>;
