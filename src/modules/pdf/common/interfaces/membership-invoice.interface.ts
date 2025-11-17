import { EMembershipType } from "src/modules/memberships/common/enums";
import { Payment } from "src/modules/payments/entities";
import { TProcessMembershipPaymentUserRole } from "src/modules/memberships/common/types";

export interface IMembershipInvoice {
  payment: Payment;
  userRole: TProcessMembershipPaymentUserRole;
  membershipType: EMembershipType;
  isUserFromAu: boolean;
  issueDate: string;
}
