import { NonNullableProperties, StrictOmit } from "src/common/types";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { PaymentInformation } from "src/modules/payment-information/entities";
import { Payment } from "src/modules/payments/entities";
import { UserRole, User, UserProfile } from "src/modules/users/entities";
import { TGetFullAddress } from "src/modules/pdf/common/types";
import { AbnCheck } from "src/modules/abn/entities";
import { Company } from "src/modules/companies/entities";

/**
 ** Type
 */

export type TGeneratePayInReceiptPayment = StrictOmit<
  Pick<
    Payment,
    "id" | "updatingDate" | "currency" | "totalAmount" | "totalGstAmount" | "totalFullAmount" | "estimatedCostAmount"
  >,
  "totalAmount" | "totalGstAmount" | "totalFullAmount" | "estimatedCostAmount"
> & {
  totalAmount: number;
  totalGstAmount: number;
  totalFullAmount: number;
  estimatedCostAmount: number;
  company:
    | (Pick<Company, "name" | "platformId" | "contactEmail"> & {
        address: TGetFullAddress;
      })
    | null;
};

export type TGeneratePayInReceiptAppointment = NonNullableProperties<
  Pick<
    Appointment,
    | "id"
    | "platformId"
    | "interpreterType"
    | "schedulingType"
    | "communicationType"
    | "businessStartTime"
    | "businessEndTime"
    | "topic"
  >,
  "businessStartTime" | "businessEndTime"
> & {
  interpreter:
    | (Pick<UserRole, "id" | "operatedByCompanyId"> & {
        user: NonNullableProperties<Pick<User, "platformId">, "platformId">;
      })
    | null;
  client: NonNullableProperties<
    Pick<UserRole, "id" | "operatedByMainCorporateCompanyId" | "timezone"> & {
      user: NonNullableProperties<Pick<User, "platformId">, "platformId">;
      paymentInformation: Pick<PaymentInformation, "stripeClientLastFour">;
      profile: Pick<UserProfile, "title" | "firstName" | "middleName" | "lastName" | "contactEmail">;
      address: TGetFullAddress;
      abnCheck: Pick<AbnCheck, "abnNumber"> | null;
    },
    "timezone"
  >;
};

export type TGeneratePayOutReceiptAppointment = NonNullableProperties<
  Pick<
    Appointment,
    | "id"
    | "interpreterType"
    | "schedulingType"
    | "communicationType"
    | "businessStartTime"
    | "businessEndTime"
    | "platformId"
    | "topic"
  >,
  "businessStartTime" | "businessEndTime"
>;

export type TGeneratePayOutReceiptInterpreter = NonNullableProperties<Pick<UserRole, "id" | "timezone">, "timezone"> & {
  user: NonNullableProperties<Pick<User, "platformId">, "platformId">;
  paymentInformation: Pick<PaymentInformation, "stripeClientLastFour">;
  profile: Pick<UserProfile, "title" | "firstName" | "middleName" | "lastName" | "contactEmail">;
  address: TGetFullAddress;
  abnCheck: Pick<AbnCheck, "abnNumber"> | null;
};

export type TGenerateTaxInvoiceReceiptAppointment = NonNullableProperties<
  Pick<
    Appointment,
    "id" | "businessStartTime" | "communicationType" | "schedulingType" | "topic" | "businessEndTime" | "platformId"
  >,
  "businessStartTime" | "businessEndTime"
>;

export type TGenerateTaxInvoiceReceiptInterpreter = NonNullableProperties<
  Pick<UserRole, "id" | "timezone">,
  "timezone"
> & {
  user: NonNullableProperties<Pick<User, "platformId">, "platformId">;
  paymentInformation: Pick<PaymentInformation, "stripeClientLastFour">;
  profile: Pick<UserProfile, "title" | "firstName" | "middleName" | "lastName" | "contactEmail">;
  address: TGetFullAddress;
  abnCheck: Pick<AbnCheck, "abnNumber"> | null;
};
