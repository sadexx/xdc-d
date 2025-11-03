import {
  EPaymentCurrency,
  EPaymentCustomerType,
  EPaymentDirection,
  EPaymentStatus,
  EPaymentSystem,
  EStripeInterpreterPayOutType,
} from "src/modules/payments-new/common/enums";
import {
  TCreatePaymentRecordAppointment,
  TCreatePaymentRecordClient,
  TCreatePaymentRecordCompany,
  TCreatePaymentRecordInterpreter,
  TCreatePaymentRecordPayment,
} from "src/modules/payments-new/common/types";
import { IPaymentCalculationResult } from "src/modules/payments-new/common/interfaces";

export interface ICreatePaymentRecord {
  currency: EPaymentCurrency;
  status: EPaymentStatus;
  direction?: EPaymentDirection;
  customerType?: EPaymentCustomerType;
  system?: EPaymentSystem;
  paymentMethodInfo?: string;
  isDepositCharge?: boolean;
  externalId?: string;
  note?: string;
  membershipId?: string;
  transferId?: string;
  stripeInterpreterPayoutType?: EStripeInterpreterPayOutType;
  prices?: IPaymentCalculationResult;
  fromClient?: TCreatePaymentRecordClient;
  toInterpreter?: TCreatePaymentRecordInterpreter;
  appointment?: TCreatePaymentRecordAppointment;
  company?: TCreatePaymentRecordCompany;
  existingPayment?: TCreatePaymentRecordPayment;
}
