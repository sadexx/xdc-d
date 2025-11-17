import { FindOptionsRelations, FindOptionsSelect } from "typeorm";
import { QueryResultType, StrictOmit } from "src/common/types";
import { UserRole } from "src/modules/users/entities";
import { Membership, MembershipPrice } from "src/modules/memberships/entities";

/**
 ** Type
 */

export type TGetMembershipPriceMembership = Pick<Membership, "id"> & {
  membershipPrices: Pick<MembershipPrice, "id" | "region" | "price" | "gstAmount" | "currency" | "stripePriceId">[];
};

export type TGetMembershipPriceUserRole = Pick<UserRole, "id" | "country">;

export type TMembershipPriceForUpdate = StrictOmit<TLoadMembershipPriceForUpdate, "price" | "gstAmount"> & {
  price: number;
  gstAmount: number | null;
};

/**
 ** Query types
 */

export const LoadMembershipPriceForUpdateQuery = {
  select: {
    id: true,
    price: true,
    gstAmount: true,
    stripePriceId: true,
    currency: true,
    region: true,
    membership: {
      id: true,
      currentMemberships: {
        id: true,
        discountHolder: {
          id: true,
          userRole: { id: true, paymentInformation: { id: true, stripeClientAccountId: true } },
        },
      },
    },
  } as const satisfies FindOptionsSelect<MembershipPrice>,
  relations: {
    membership: { currentMemberships: { discountHolder: { userRole: { paymentInformation: true } } } },
  } as const satisfies FindOptionsRelations<MembershipPrice>,
};
export type TLoadMembershipPriceForUpdate = QueryResultType<
  MembershipPrice,
  typeof LoadMembershipPriceForUpdateQuery.select
>;

export const UpdateExistingMembershipSubscriptionsQuery = {
  select: {
    id: true,
    type: true,
    currentMemberships: {
      id: true,
      endDate: true,
      discountHolder: {
        id: true,
        userRole: {
          id: true,
          country: true,
          profile: { id: true, contactEmail: true, firstName: true, preferredName: true },
        },
      },
    },
    membershipPrices: { id: true, stripePriceId: true, region: true, price: true, gstAmount: true, currency: true },
  } as const satisfies FindOptionsSelect<Membership>,
  relations: {
    currentMemberships: { discountHolder: { userRole: { profile: true } } },
    membershipPrices: true,
  } as const satisfies FindOptionsRelations<Membership>,
};
export type TUpdateExistingMembershipSubscriptions = QueryResultType<
  Membership,
  typeof UpdateExistingMembershipSubscriptionsQuery.select
>;
