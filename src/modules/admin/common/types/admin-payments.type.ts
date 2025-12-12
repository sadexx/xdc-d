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

export type TMarkPaymentsInvoicedCompany = NonNullableProperties<TBaseMarkPaymentsInvoicedCompany, "depositAmount">;

export type TGenerateCorporatePostPaymentReceipt = TBaseGenerateCorporatePostPaymentReceipt & {
  appointment: NonNullableProperties<
    NonNullable<TBaseGenerateCorporatePostPaymentReceipt["appointment"]>,
    "businessStartTime" | "businessEndTime"
  > & {
    client: NonNullableProperties<
      NonNullable<NonNullable<TBaseGenerateCorporatePostPaymentReceipt["appointment"]>["client"]>,
      "timezone"
    >;
    interpreter: NonNullable<NonNullable<TBaseGenerateCorporatePostPaymentReceipt["appointment"]>["interpreter"]>;
  };
};

export type TValidatePostPayments = Pick<Payment, "id" | "system"> & {
  items: Pick<PaymentItem, "id" | "status">[];
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

export const MarkPaymentsInvoicedQuery = {
  select: {
    id: true,
    system: true,
    totalFullAmount: true,
    items: { id: true, status: true },
  } as const satisfies FindOptionsSelect<Payment>,
  relations: { items: true } as const satisfies FindOptionsRelations<Payment>,
};
export type TMarkPaymentsInvoiced = QueryResultType<Payment, typeof MarkPaymentsInvoicedQuery.select>;

export const MarkPaymentsInvoicedCompanyQuery = {
  select: {
    id: true,
    depositAmount: true,
  } as const satisfies FindOptionsSelect<Company>,
};
type TBaseMarkPaymentsInvoicedCompany = QueryResultType<Company, typeof MarkPaymentsInvoicedCompanyQuery.select>;

export const GenerateCorporatePostPaymentReceiptQuery = {
  select: {
    id: true,
    currency: true,
    totalAmount: true,
    totalGstAmount: true,
    totalFullAmount: true,
    system: true,
    appointment: {
      id: true,
      platformId: true,
      businessStartTime: true,
      businessEndTime: true,
      interpreterType: true,
      schedulingType: true,
      communicationType: true,
      topic: true,
      client: { timezone: true },
      interpreter: { id: true, user: { platformId: true } },
    },
    items: { id: true, status: true },
  } as const satisfies FindOptionsSelect<Payment>,
  relations: {
    appointment: { client: true, interpreter: { user: true } },
    items: true,
  } as const satisfies FindOptionsRelations<Payment>,
};
type TBaseGenerateCorporatePostPaymentReceipt = QueryResultType<
  Payment,
  typeof GenerateCorporatePostPaymentReceiptQuery.select
>;

export const GenerateCorporatePostPaymentReceiptCompanyQuery = {
  select: {
    id: true,
    platformId: true,
    name: true,
    contactEmail: true,
    address: { country: true, state: true, suburb: true, postcode: true, streetNumber: true, streetName: true },
  } as const satisfies FindOptionsSelect<Company>,
  relations: { address: true } as const satisfies FindOptionsRelations<Company>,
};
export type TGenerateCorporatePostPaymentReceiptCompany = QueryResultType<
  Company,
  typeof GenerateCorporatePostPaymentReceiptCompanyQuery.select
>;
