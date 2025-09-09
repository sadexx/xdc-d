import { EMembershipAssignmentStatus } from "src/modules/memberships/common/enums";
import { Membership } from "src/modules/memberships/entities";

export interface ICreateMembershipAssignment {
  status: EMembershipAssignmentStatus;
  discount: number;
  onDemandMinutes: number;
  preBookedMinutes: number;
  startDate?: Date;
  endDate?: Date;
  currentMembership: Membership;
  nextMembership: Membership;
}
