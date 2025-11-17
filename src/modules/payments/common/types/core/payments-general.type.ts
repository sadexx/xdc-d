import { Payment, PaymentItem } from "src/modules/payments/entities";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { User, UserRole } from "src/modules/users/entities";
import { Company } from "src/modules/companies/entities";
import { NonNullableProperties } from "src/common/types";

/**
 ** Type
 */

export type TGetIndividualPaymentsQueryBuilder = NonNullableProperties<
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
    | "isDepositCharge"
    | "membershipId"
    | "updatingDate"
  >,
  "platformId"
> & {
  appointment: Pick<Appointment, "id" | "platformId" | "scheduledStartTime" | "businessStartTime"> | null;
  fromClient:
    | (Pick<UserRole, "id"> & {
        user: Pick<User, "id" | "platformId">;
      })
    | null;
  company: Pick<Company, "id" | "platformId"> | null;
  items: Pick<
    PaymentItem,
    "id" | "amount" | "gstAmount" | "fullAmount" | "currency" | "status" | "receipt" | "creationDate" | "updatingDate"
  >[];
};
