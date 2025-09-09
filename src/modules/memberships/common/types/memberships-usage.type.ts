import { FindOptionsSelect, FindOptionsRelations } from "typeorm";
import { QueryResultType } from "src/common/types";
import { Membership, MembershipAssignment } from "src/modules/memberships/entities";
import { Appointment } from "src/modules/appointments/appointment/entities";

/**
 ** Type
 */

export type TFetchMembershipDiscount = Pick<
  MembershipAssignment,
  "id" | "onDemandMinutes" | "preBookedMinutes" | "discount"
> & {
  currentMembership: Pick<Membership, "type">;
};

export type TApplyAppointmentFreeMinutes = Pick<Appointment, "communicationType" | "schedulingType">;

export type TAdjustMembershipFreeMinutesAssignment = Pick<
  MembershipAssignment,
  "id" | "onDemandMinutes" | "preBookedMinutes"
>;

export type TAdjustMembershipFreeMinutesAppointment = Pick<Appointment, "schedulingType">;

/**
 ** Query types
 */

export const DeductFreeMinutesQuery = {
  select: {
    id: true,
    onDemandMinutes: true,
    preBookedMinutes: true,
    discount: true,
    currentMembership: { id: true, type: true },
  } as const satisfies FindOptionsSelect<MembershipAssignment>,
  relations: { currentMembership: true } as const satisfies FindOptionsRelations<MembershipAssignment>,
};
export type TDeductFreeMinutes = QueryResultType<MembershipAssignment, typeof DeductFreeMinutesQuery.select>;
