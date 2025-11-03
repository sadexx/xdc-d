import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TransferContextQueryOptionsService } from "src/modules/payment-analysis/services/transfer";
import {
  TInterpreterTransferContext,
  TLoadAppointmentTransferContext,
  TLoadCompanyTransferContext,
  TLoadPaymentTransferContext,
} from "src/modules/payment-analysis/common/types/transfer";
import { findOneOrFailTyped, round2 } from "src/common/utils";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { EUserRoleName } from "src/modules/users/common/enums";
import { Company } from "src/modules/companies/entities";
import { IPaymentCalculationResult } from "src/modules/payments-new/common/interfaces";
import { LokiLogger } from "src/common/logger";
import { EExtAbnStatus } from "src/modules/abn/common/enums";
import { EExtCountry } from "src/modules/addresses/common/enums";
import { DIVIDER_FOR_LANG_BUDDIES_WITHOUT_ABN } from "src/common/constants";
import {
  ICalculateInterpreterPrices,
  IPaymentTransferContext,
  ITransferPaymentContext,
} from "src/modules/payment-analysis/common/interfaces/transfer";
import { EPaymentCurrency, EPaymentSystem } from "src/modules/payments-new/common/enums";
import { EPaymentOperation } from "src/modules/payment-analysis/common/enums";
import { Payment } from "src/modules/payments-new/entities";

@Injectable()
export class TransferContextService {
  private readonly lokiLogger = new LokiLogger(TransferContextService.name);
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly transferContextQueryOptionsService: TransferContextQueryOptionsService,
  ) {}

  /**
   * Loads transfer context for interpreter payout.
   * @param appointmentId - Appointment to process.
   * @param prices - Pre-calculated end prices.
   * @returns Context or null if no interpreter.
   * @throws {NotFoundException} If required entities missing.
   */
  public async loadPaymentContextForTransfer(
    appointmentId: string,
    prices: IPaymentCalculationResult,
  ): Promise<ITransferPaymentContext | null> {
    const appointment = await this.loadAppointmentContext(appointmentId);

    if (!appointment.interpreter) {
      if (!appointment.appointmentAdminInfo.isInterpreterFound) {
        this.lokiLogger.warn(`Appointment with id ${appointment.id} does not have interpreter.`);
      }

      return null;
    }

    const interpreterPrices = this.calculateInterpreterPrices(appointment.interpreter, prices);

    const paymentMethodInfo = this.determinePaymentMethodInfo(appointment.interpreter);

    const isPersonalCard = this.determineIfPersonalCard(appointment.interpreter);

    const isInterpreterCorporate = this.determineIfInterpreterCorporate(appointment.interpreter);

    const currency = this.determineCurrency();

    const company = isInterpreterCorporate
      ? await this.loadCompanyContext(appointment.interpreter.operatedByCompanyId)
      : null;

    const paymentContext = await this.loadPaymentContext(appointmentId);

    return {
      operation: EPaymentOperation.TRANSFER_PAYMENT,
      appointment,
      interpreter: appointment.interpreter,
      interpreterPrices,
      paymentMethodInfo,
      isPersonalCard,
      isInterpreterCorporate,
      currency,
      paymentContext,
      company,
    };
  }

  private async loadAppointmentContext(appointmentId: string): Promise<TLoadAppointmentTransferContext> {
    const queryOptions = this.transferContextQueryOptionsService.loadAppointmentTransferContextOptions(appointmentId);

    return await findOneOrFailTyped<TLoadAppointmentTransferContext>(
      appointmentId,
      this.appointmentRepository,
      queryOptions,
    );
  }

  private async loadCompanyContext(companyId: string): Promise<TLoadCompanyTransferContext> {
    const queryOptions = this.transferContextQueryOptionsService.loadCompanyTransferContextOptions(companyId);

    return await findOneOrFailTyped<TLoadCompanyTransferContext>(companyId, this.companyRepository, queryOptions);
  }

  private async loadPaymentContext(appointmentId: string): Promise<IPaymentTransferContext> {
    const queryOptions = this.transferContextQueryOptionsService.loadPaymentTransferContextOptions(appointmentId);

    const incomingPayment = await findOneOrFailTyped<TLoadPaymentTransferContext>(
      appointmentId,
      this.paymentRepository,
      queryOptions.incomingPayment,
    );
    const outcomingPayment = await findOneOrFailTyped<TLoadPaymentTransferContext>(
      appointmentId,
      this.paymentRepository,
      queryOptions.outcomingPayment,
    );

    return { incomingPayment, outcomingPayment };
  }

  private calculateInterpreterPrices(
    interpreter: TInterpreterTransferContext,
    prices: IPaymentCalculationResult,
  ): ICalculateInterpreterPrices {
    const { role, country, abnCheck } = interpreter;
    const hasActiveAbn = abnCheck?.abnStatus === EExtAbnStatus.ACTIVE;

    let adjustedInterpreterAmount = prices.interpreterAmount;

    if (this.shouldAdjustForLangBuddyWithoutABN(role, country, abnCheck, hasActiveAbn)) {
      adjustedInterpreterAmount = round2(prices.interpreterAmount / DIVIDER_FOR_LANG_BUDDIES_WITHOUT_ABN);
    }

    return {
      interpreterAmount: adjustedInterpreterAmount,
      interpreterGstAmount: prices.interpreterGstAmount,
      interpreterFullAmount: adjustedInterpreterAmount + prices.interpreterGstAmount,
    };
  }

  private shouldAdjustForLangBuddyWithoutABN(
    role: TInterpreterTransferContext["role"],
    country: string,
    abnCheck: TInterpreterTransferContext["abnCheck"],
    hasActiveAbn: boolean,
  ): boolean {
    return (
      role.name === EUserRoleName.IND_LANGUAGE_BUDDY_INTERPRETER &&
      country === EExtCountry.AUSTRALIA &&
      (!abnCheck || !hasActiveAbn)
    );
  }

  private determinePaymentMethodInfo(interpreter: TInterpreterTransferContext): string {
    const { paymentInformation } = interpreter;
    switch (paymentInformation.interpreterSystemForPayout) {
      case EPaymentSystem.STRIPE: {
        const isPersonalCard =
          paymentInformation.stripeInterpreterCardId && paymentInformation.stripeInterpreterCardLast4;

        return isPersonalCard
          ? `Credit Card ${paymentInformation.stripeInterpreterCardLast4}`
          : `Bank Account ${paymentInformation.stripeInterpreterBankAccountLast4}`;
      }
      default:
        return `Paypal Account ${paymentInformation.paypalEmail}`;
    }
  }

  private determineIfPersonalCard(interpreter: TInterpreterTransferContext): boolean {
    const { paymentInformation } = interpreter;

    return Boolean(paymentInformation.stripeInterpreterCardId && paymentInformation.stripeInterpreterCardLast4);
  }

  private determineIfInterpreterCorporate(interpreter: TInterpreterTransferContext): boolean {
    return interpreter.role.name === EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_IND_INTERPRETER;
  }

  private determineCurrency(): EPaymentCurrency {
    return EPaymentCurrency.AUD;
  }
}
