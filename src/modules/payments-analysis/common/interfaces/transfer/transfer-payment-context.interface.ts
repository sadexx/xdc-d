import {
  TInterpreterTransferContext,
  TLoadAppointmentTransferContext,
  TLoadCompanyTransferContext,
} from "src/modules/payments-analysis/common/types/transfer";
import {
  ICalculateInterpreterPrices,
  IPaymentTransferContext,
} from "src/modules/payments-analysis/common/interfaces/transfer";
import { EPaymentCurrency } from "src/modules/payments/common/enums/core";
import { EPaymentOperation } from "src/modules/payments-analysis/common/enums/core";

export interface ITransferPaymentContext {
  operation: EPaymentOperation.TRANSFER_PAYMENT;
  isSecondAttempt: boolean;
  appointment: TLoadAppointmentTransferContext;
  interpreter: TInterpreterTransferContext;
  interpreterPrices: ICalculateInterpreterPrices;
  isInterpreterCorporate: boolean;
  paymentMethodInfo: string;
  isPersonalCard: boolean;
  currency: EPaymentCurrency;
  paymentContext: IPaymentTransferContext;
  company: TLoadCompanyTransferContext | null;
}
