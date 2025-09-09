import { FindOptionsSelect } from "typeorm";
import { QueryResultType } from "src/common/types";
import { PromoCampaign, PromoCampaignAssignment } from "src/modules/promo-campaigns/entities";
import { UserRole } from "src/modules/users/entities";

/**
 ** Type
 */

export type TCreateOrUpdatePromoCampaignAssignmentPromoCampaign = Pick<
  PromoCampaign,
  "id" | "discount" | "discountMinutes" | "usageLimit"
>;

/**
 ** Query types
 */

export const AssignPromoCampaignQuery = {
  select: {
    id: true,
    target: true,
    discount: true,
    discountMinutes: true,
    usageLimit: true,
    status: true,
  } as const satisfies FindOptionsSelect<PromoCampaign>,
};
export type TAssignPromoCampaign = QueryResultType<PromoCampaign, typeof AssignPromoCampaignQuery.select>;

export const AssignPromoCampaignUserRoleQuery = {
  select: {
    id: true,
    operatedByCompanyId: true,
    operatedByMainCorporateCompanyId: true,
    discountHolder: {
      id: true,
      promoCampaignAssignment: {
        id: true,
      },
    },
  } as const satisfies FindOptionsSelect<UserRole>,
  relations: {
    discountHolder: { promoCampaignAssignment: true },
  },
};
export type TAssignPromoCampaignUserRole = QueryResultType<UserRole, typeof AssignPromoCampaignUserRoleQuery.select>;

export const AssignNewUserPromoCampaignQuery = {
  select: {
    id: true,
    discount: true,
    discountMinutes: true,
    usageLimit: true,
  } as const satisfies FindOptionsSelect<PromoCampaign>,
};
export type TAssignNewUserPromoCampaign = QueryResultType<PromoCampaign, typeof AssignNewUserPromoCampaignQuery.select>;

export const UnassignPromoCampaignQuery = {
  select: {
    id: true,
  } as const satisfies FindOptionsSelect<PromoCampaignAssignment>,
};
export type TUnassignPromoCampaign = QueryResultType<PromoCampaignAssignment, typeof UnassignPromoCampaignQuery.select>;

export const CreateOrUpdatePromoCampaignAssignmentQuery = {
  select: {
    id: true,
  } as const satisfies FindOptionsSelect<PromoCampaignAssignment>,
};
export type TCreateOrUpdatePromoCampaignAssignment = QueryResultType<
  PromoCampaignAssignment,
  typeof CreateOrUpdatePromoCampaignAssignmentQuery.select
>;
