import { EMembershipType } from "src/modules/memberships/common/enums";
import { Payment } from "src/modules/payments-new/entities";
import { TProcessMembershipPaymentUserRole } from "src/modules/memberships/common/types";

export interface IGenerateMembershipInvoice {
  payment: Payment;
  userRole: TProcessMembershipPaymentUserRole;
  membershipType: EMembershipType;
}
