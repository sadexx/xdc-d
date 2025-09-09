import { FindOptionsRelations, FindOptionsSelect } from "typeorm";
import { QueryResultType } from "src/common/types";
import { UserProfile, UserRole } from "src/modules/users/entities";
import { Membership, MembershipAssignment } from "src/modules/memberships/entities";
import { DiscountHolder } from "src/modules/discounts/entities";
import { TGetMembershipPriceMembership } from "src/modules/memberships/common/types";

/**
 ** Type
 */

export type TGetTrialEndTimestampDiscountHolder = Pick<DiscountHolder, "id"> & {
  membershipAssignment:
    | (Pick<MembershipAssignment, "id" | "status" | "endDate"> & {
        currentMembership: Pick<Membership, "id" | "type">;
      })
    | null;
};

export type TProcessNotifyMembershipChanges = Pick<Membership, "id" | "type"> & {
  membershipPrices: TGetMembershipPriceMembership["membershipPrices"];
  currentMemberships: TProcessNotifyMembershipChangesMembershipAssignment[];
};
export type TProcessNotifyMembershipChangesMembershipAssignment = Pick<MembershipAssignment, "id" | "endDate"> & {
  discountHolder: Pick<DiscountHolder, "id"> & {
    userRole:
      | (Pick<UserRole, "id" | "country"> & {
          profile: Pick<UserProfile, "id" | "contactEmail" | "firstName" | "preferredName">;
        })
      | null;
  };
};

/**
 ** Query types
 */

export const GetAdminMembershipsQuery = {
  select: {
    id: true,
    type: true,
    status: true,
    discount: true,
    onDemandMinutes: true,
    preBookedMinutes: true,
    isMostPopular: true,
    membershipPrices: { id: true, region: true, price: true, gstAmount: true, currency: true },
  } as const satisfies FindOptionsSelect<Membership>,
  relations: { membershipPrices: true } as const satisfies FindOptionsRelations<Membership>,
};
export type TGetAdminMemberships = QueryResultType<Membership, typeof GetAdminMembershipsQuery.select>;

export const GetUserMembershipsUserRoleQuery = {
  select: { id: true, country: true } as const satisfies FindOptionsSelect<UserRole>,
};
export type TGetUserMembershipsUserRole = QueryResultType<UserRole, typeof GetUserMembershipsUserRoleQuery.select>;

export const GetUserMembershipsQuery = {
  select: {
    id: true,
    type: true,
    status: true,
    discount: true,
    onDemandMinutes: true,
    preBookedMinutes: true,
    isMostPopular: true,
    membershipPrices: { id: true, region: true, price: true, gstAmount: true, currency: true, stripePriceId: true },
  } as const satisfies FindOptionsSelect<Membership>,
  relations: { membershipPrices: true } as const satisfies FindOptionsRelations<Membership>,
};
export type TGetUserMemberships = QueryResultType<Membership, typeof GetUserMembershipsQuery.select>;

export const ProcessMembershipSubscriptionUserRoleQuery = {
  select: {
    id: true,
    country: true,
    paymentInformation: { id: true, stripeClientAccountId: true, stripeClientPaymentMethodId: true },
    discountHolder: {
      id: true,
      membershipAssignment: { id: true, status: true, endDate: true, currentMembership: { id: true, type: true } },
    },
  } as const satisfies FindOptionsSelect<UserRole>,
  relations: {
    paymentInformation: true,
    discountHolder: { membershipAssignment: { currentMembership: true } },
  } as const satisfies FindOptionsRelations<UserRole>,
};
export type TProcessMembershipSubscriptionUserRole = QueryResultType<
  UserRole,
  typeof ProcessMembershipSubscriptionUserRoleQuery.select
>;

export const ProcessMembershipSubscriptionQuery = {
  select: {
    id: true,
    type: true,
    membershipPrices: { id: true, stripePriceId: true, region: true, price: true, gstAmount: true, currency: true },
  } as const satisfies FindOptionsSelect<Membership>,
  relations: { membershipPrices: true } as const satisfies FindOptionsRelations<Membership>,
};
export type TProcessMembershipSubscription = QueryResultType<
  Membership,
  typeof ProcessMembershipSubscriptionQuery.select
>;

export const CancelMembershipSubscriptionUserRoleQuery = {
  select: {
    id: true,
    paymentInformation: { id: true, stripeClientAccountId: true },
    discountHolder: { id: true, membershipAssignment: { id: true } },
  } as const satisfies FindOptionsSelect<UserRole>,
  relations: {
    paymentInformation: true,
    discountHolder: { membershipAssignment: true },
  } as const satisfies FindOptionsRelations<UserRole>,
};
export type TCancelMembershipSubscriptionUserRole = QueryResultType<
  UserRole,
  typeof CancelMembershipSubscriptionUserRoleQuery.select
>;

export const ActivateMembershipQuery = {
  select: {
    id: true,
    membershipPrices: { id: true, stripePriceId: true },
  } as const satisfies FindOptionsSelect<Membership>,
  relations: { membershipPrices: true } as const satisfies FindOptionsRelations<Membership>,
};
export type TActivateMembership = QueryResultType<Membership, typeof ActivateMembershipQuery.select>;

export const DeactivateMembershipQuery = {
  select: {
    id: true,
    status: true,
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
export type TDeactivateMembership = QueryResultType<Membership, typeof DeactivateMembershipQuery.select>;
