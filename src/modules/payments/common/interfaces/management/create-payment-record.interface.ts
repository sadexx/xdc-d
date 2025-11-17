import {
  EPaymentCurrency,
  EPaymentCustomerType,
  EPaymentDirection,
  EPaymentStatus,
  EPaymentSystem,
  EStripeInterpreterPayOutType,
} from "src/modules/payments/common/enums/core";
import { IPaymentCalculationResult } from "src/modules/payments/common/interfaces/pricing";
import {
  TCreatePaymentRecordClient,
  TCreatePaymentRecordInterpreter,
  TCreatePaymentRecordAppointment,
  TCreatePaymentRecordCompany,
  TCreatePaymentRecordPayment,
} from "src/modules/payments/common/types/management";

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
