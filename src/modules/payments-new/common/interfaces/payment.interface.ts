import {
  EPaymentCurrency,
  EPaymentCustomerType,
  EPaymentDirection,
  EPaymentSystem,
  EStripeInterpreterPayOutType,
} from "src/modules/payments-new/common/enums";
import { UserRole } from "src/modules/users/entities";
import { Company } from "src/modules/companies/entities";
import { Appointment } from "src/modules/appointments/appointment/entities";

export interface IPayment {
  platformId: string;
  totalAmount: number;
  totalGstAmount: number;
  totalFullAmount: number;
  estimatedCostAmount: number;
  paymentMethodInfo: string;
  isDepositCharge: boolean;
  currency: EPaymentCurrency;
  direction: EPaymentDirection;
  customerType: EPaymentCustomerType;
  system: EPaymentSystem;
  membershipId: string | null;
  note: string | null;
  stripeInterpreterPayoutType: EStripeInterpreterPayOutType | null;
  fromClient: UserRole | null;
  toInterpreter: UserRole | null;
  company: Company | null;
  appointment: Appointment | null;
}
