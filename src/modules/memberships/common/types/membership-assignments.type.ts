import { FindOptionsRelations, FindOptionsSelect } from "typeorm";
import { QueryResultType } from "src/common/types";
import { Membership, MembershipAssignment } from "src/modules/memberships/entities";
import { UserRole } from "src/modules/users/entities";
import { Appointment } from "src/modules/appointments/appointment/entities";

/**
 ** Type
 */

export type TConstructMembershipAssignmentDto = Pick<
  Membership,
  "id" | "discount" | "onDemandMinutes" | "preBookedMinutes"
>;

export type TValidateMembershipAssignmentAvailabilityAssignment = Pick<
  MembershipAssignment,
  "startDate" | "endDate" | "status"
> & {
  currentMembership: Pick<Membership, "status">;
};

export type TValidateMembershipAssignmentAvailabilityAppointment = Pick<
  Appointment,
  "scheduledStartTime" | "interpretingType" | "communicationType"
>;

/**
 ** Query types
 */

export const GetSubscriptionStatusQuery = {
  select: {
    currentMembership: { id: true, type: true },
    nextMembership: { id: true, type: true },
  } as const satisfies FindOptionsSelect<MembershipAssignment>,
  relations: {
    currentMembership: true,
    nextMembership: true,
  } as const satisfies FindOptionsRelations<MembershipAssignment>,
};
export type TGetSubscriptionStatus = QueryResultType<MembershipAssignment, typeof GetSubscriptionStatusQuery.select>;

export const ProcessMembershipAssignmentMembershipQuery = {
  select: {
    id: true,
    type: true,
    discount: true,
    onDemandMinutes: true,
    preBookedMinutes: true,
  } as const satisfies FindOptionsSelect<Membership>,
};
export type TProcessMembershipAssignmentMembership = QueryResultType<
  Membership,
  typeof ProcessMembershipAssignmentMembershipQuery.select
>;

export const ProcessMembershipAssignmentQuery = {
  select: {
    id: true,
    status: true,
    onDemandMinutes: true,
    preBookedMinutes: true,
    currentMembership: { id: true, type: true },
  } as const satisfies FindOptionsSelect<MembershipAssignment>,
  relations: { currentMembership: true } as const satisfies FindOptionsRelations<MembershipAssignment>,
};
export type TProcessMembershipAssignment = QueryResultType<
  MembershipAssignment,
  typeof ProcessMembershipAssignmentQuery.select
>;

export const ConstructAndCreateMembershipAssignmentQuery = {
  select: { id: true } as const satisfies FindOptionsSelect<UserRole>,
};
export type TConstructAndCreateMembershipAssignment = QueryResultType<
  UserRole,
  typeof ConstructAndCreateMembershipAssignmentQuery.select
>;
