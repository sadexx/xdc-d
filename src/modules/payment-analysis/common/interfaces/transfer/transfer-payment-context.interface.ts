import {
  TInterpreterTransferContext,
  TLoadAppointmentTransferContext,
  TLoadCompanyTransferContext,
} from "src/modules/payment-analysis/common/types/transfer";
import {
  ICalculateInterpreterPrices,
  IPaymentTransferContext,
} from "src/modules/payment-analysis/common/interfaces/transfer";
import { EPaymentCurrency } from "src/modules/payments-new/common/enums";
import { EPaymentOperation } from "src/modules/payment-analysis/common/enums";

export interface ITransferPaymentContext {
  operation: EPaymentOperation.TRANSFER_PAYMENT;
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
