import { FindOptionsRelations, FindOptionsSelect } from "typeorm";
import { NonNullableProperties, QueryResultType } from "src/common/types";
import { User, UserProfile, UserRole } from "src/modules/users/entities";
import { Address } from "src/modules/addresses/entities";
import { Company } from "src/modules/companies/entities";
import { Payment } from "src/modules/payments-new/entities";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { PaymentInformation } from "src/modules/payment-information/entities";

/**
 ** Type
 */

export type TLoadRecipientPdfDataPayment = Pick<Payment, "id"> & {
  company:
    | (Pick<Company, "name" | "platformId"> & {
        address: TGetFullAddress;
      })
    | null;
};

export type TLoadRecipientPdfDataUserRole = Pick<UserRole, "id"> & {
  user: NonNullableProperties<Pick<User, "platformId">, "platformId">;
  paymentInformation: Pick<PaymentInformation, "stripeClientLastFour">;
  profile: TGetFullUserName["profile"];
  address: TGetFullAddress;
};

export type TGetFullUserName = Pick<UserRole, "id"> & {
  profile: Pick<UserProfile, "title" | "firstName" | "middleName" | "lastName">;
};

export type TGetFullAddress = Pick<
  Address,
  "streetNumber" | "streetName" | "suburb" | "state" | "postcode" | "country"
>;

export type TGetAppointmentServiceType = Pick<Appointment, "interpreterType" | "schedulingType" | "communicationType">;

export type TGetAppointmentDate = NonNullableProperties<
  Pick<Appointment, "id" | "businessStartTime"> & {
    client: NonNullableProperties<Pick<UserRole, "timezone">, "timezone">;
  },
  "businessStartTime"
>;

export type TGenerateMembershipInvoiceUserRole = Pick<UserRole, "id" | "country"> & {
  address: Pick<Address, "id" | "streetNumber" | "streetName" | "suburb" | "state" | "postcode"> | null;
  profile: Pick<UserProfile, "id" | "firstName" | "lastName">;
  user: Pick<User, "id" | "platformId">;
};

/**
 ** Query types
 */

export const LoadLfhCompanyPdfDataQuery = {
  select: {
    id: true,
    name: true,
    abnNumber: true,
    address: { streetNumber: true, streetName: true, suburb: true, state: true, postcode: true, country: true },
  } as const satisfies FindOptionsSelect<Company>,
  relations: { address: true } as const satisfies FindOptionsRelations<Company>,
};
export type TLoadLfhCompanyPdfData = NonNullableProperties<
  QueryResultType<Company, typeof LoadLfhCompanyPdfDataQuery.select>,
  "abnNumber"
>;
