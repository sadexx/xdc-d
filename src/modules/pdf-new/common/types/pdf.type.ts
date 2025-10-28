import { NonNullableProperties } from "src/common/types";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { PaymentInformation } from "src/modules/payment-information/entities";
import { Payment } from "src/modules/payments-new/entities";
import { UserRole, User, UserProfile } from "src/modules/users/entities";
import { TLoadRecipientPdfDataPayment, TGetFullAddress } from "src/modules/pdf-new/common/types";

/**
 ** Type
 */

export type TGeneratePayInReceiptPayment = Pick<
  Payment,
  "id" | "updatingDate" | "currency" | "totalAmount" | "totalGstAmount" | "totalFullAmount" | "estimatedCostAmount"
> & {
  company: TLoadRecipientPdfDataPayment["company"] | null;
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
      },
      "timezone"
    >;
  },
  "businessStartTime"
>;
