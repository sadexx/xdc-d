import {
  EPaymentCurrency,
  EPaymentCustomerType,
  EPaymentDirection,
  EPaymentStatus,
  EPaymentSystem,
} from "src/modules/payments-new/common/enums";
import {
  TCreatePaymentRecordAppointment,
  TCreatePaymentRecordClient,
  TCreatePaymentRecordCompany,
  TCreatePaymentRecordPayment,
} from "src/modules/payments-new/common/types";
import { IPaymentCalculationResult } from "src/modules/payments-new/common/interfaces";

export interface ICreatePaymentRecord {
  currency: EPaymentCurrency;
  direction: EPaymentDirection;
  customerType: EPaymentCustomerType;
  system: EPaymentSystem;
  paymentMethodInfo: string;
  status: EPaymentStatus;
  isDepositCharge?: boolean;
  externalId?: string;
  note?: string;
  membershipId?: string;
  transferId?: string;
  prices?: IPaymentCalculationResult;
  fromClient?: TCreatePaymentRecordClient;
  appointment?: TCreatePaymentRecordAppointment;
  company?: TCreatePaymentRecordCompany;
  existingPayment?: TCreatePaymentRecordPayment;
}
