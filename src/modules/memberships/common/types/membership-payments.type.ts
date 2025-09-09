import { FindOptionsRelations, FindOptionsSelect } from "typeorm";
import { QueryResultType } from "src/common/types";
import { UserRole } from "src/modules/users/entities";
import { Membership } from "src/modules/memberships/entities";
import { PaymentInformation } from "src/modules/payment-information/entities";
import { TGenerateMembershipInvoiceUserRole } from "src/modules/pdf/common/types";

/**
 ** Type
 */

export type TProcessAndSavePaymentMembership = Pick<Membership, "id" | "type">;

export type TProcessAndSavePaymentUserRole = Pick<UserRole, "id" | "country"> & {
  paymentInformation: Pick<PaymentInformation, "id" | "stripeClientLastFour"> | null;
  address: TGenerateMembershipInvoiceUserRole["address"];
  profile: TGenerateMembershipInvoiceUserRole["profile"];
  user: TGenerateMembershipInvoiceUserRole["user"];
};

/**
 ** Query types
 */

export const ProcessMembershipPaymentQuery = {
  select: {
    id: true,
    type: true,
    membershipPrices: { id: true, region: true, price: true, gstAmount: true, currency: true, stripePriceId: true },
  } as const satisfies FindOptionsSelect<Membership>,
  relations: { membershipPrices: true } as const satisfies FindOptionsRelations<Membership>,
};
export type TProcessMembershipPayment = QueryResultType<Membership, typeof ProcessMembershipPaymentQuery.select>;

export const ProcessMembershipPaymentUserRoleQuery = {
  select: {
    id: true,
    country: true,
    paymentInformation: { id: true, stripeClientLastFour: true },
    address: { id: true, streetNumber: true, streetName: true, suburb: true, state: true, postcode: true },
    profile: { id: true, firstName: true, lastName: true, contactEmail: true, preferredName: true },
    user: { id: true, platformId: true },
    discountHolder: { id: true, membershipAssignment: { id: true } },
  } as const satisfies FindOptionsSelect<UserRole>,
  relations: {
    paymentInformation: true,
    address: true,
    profile: true,
    user: true,
    discountHolder: { userRole: true },
  } as const satisfies FindOptionsRelations<UserRole>,
};
export type TProcessMembershipPaymentUserRole = QueryResultType<
  UserRole,
  typeof ProcessMembershipPaymentUserRoleQuery.select
>;
