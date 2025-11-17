import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TransferContextQueryOptionsService } from "src/modules/payments-analysis/services/transfer";
import {
  TInterpreterTransferContext,
  TLoadAppointmentTransferContext,
  TLoadCompanyTransferContext,
  TLoadPaymentTransferContext,
} from "src/modules/payments-analysis/common/types/transfer";
import { findOneOrFailTyped, findOneTyped } from "src/common/utils";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { EUserRoleName } from "src/modules/users/common/enums";
import { Company } from "src/modules/companies/entities";
import { LokiLogger } from "src/common/logger";
import { EExtAbnStatus } from "src/modules/abn/common/enums";
import { EExtCountry } from "src/modules/addresses/common/enums";
import { DIVIDER_FOR_LANG_BUDDIES_WITHOUT_ABN } from "src/common/constants";
import {
  ICalculateInterpreterPrices,
  IPaymentTransferContext,
  ITransferContextOptions,
  ITransferPaymentContext,
} from "src/modules/payments-analysis/common/interfaces/transfer";
import { EPaymentCurrency, EPaymentSystem } from "src/modules/payments/common/enums/core";
import { EPaymentOperation } from "src/modules/payments-analysis/common/enums/core";
import { Payment } from "src/modules/payments/entities";
import { IPaymentCalculationResult } from "src/modules/payments/common/interfaces/pricing";

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
   * Loads payment context for transferring funds to interpreter.
   *
   * Calculates interpreter prices, determines payment method, and loads company information
   * for corporate interpreters. Returns null if appointment has no interpreter assigned.
   *
   * @param appointmentId - The appointment ID to transfer payment for
   * @param options - Transfer context options
   * @returns Transfer payment context or null if no interpreter assigned
   */
  public async loadPaymentContextForTransfer(
    appointmentId: string,
    options: ITransferContextOptions,
  ): Promise<ITransferPaymentContext | null> {
    const { prices, isSecondAttempt } = options;

    const appointment = await this.loadAppointmentContext(appointmentId);

    if (!appointment.interpreter) {
      if (!appointment.appointmentAdminInfo.isInterpreterFound) {
        this.lokiLogger.warn(`Appointment with id ${appointment.id} does not have interpreter.`);
      }

      return null;
    }

    const isInterpreterCorporate = this.determineIfInterpreterCorporate(appointment.interpreter);

    const company = isInterpreterCorporate
      ? await this.loadCompanyContext(appointment.interpreter.operatedByCompanyId)
      : null;

    const interpreterPrices = this.calculateInterpreterPrices(appointment.interpreter, prices);

    const paymentMethodInfo = this.determinePaymentMethodInfo(appointment.interpreter, company);

    const isPersonalCard = this.determineIfPersonalCard(appointment.interpreter);

    const currency = this.determineCurrency();

    const paymentContext = await this.loadPaymentContext(appointmentId);

    return {
      operation: EPaymentOperation.TRANSFER_PAYMENT,
      isSecondAttempt,
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
    const outcomingPayment = await findOneTyped<TLoadPaymentTransferContext>(
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
      adjustedInterpreterAmount = prices.interpreterAmount / DIVIDER_FOR_LANG_BUDDIES_WITHOUT_ABN;
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

  private determineIfInterpreterCorporate(interpreter: TInterpreterTransferContext): boolean {
    return interpreter.role.name === EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_IND_INTERPRETER;
  }

  private determinePaymentMethodInfo(
    interpreter: TInterpreterTransferContext,
    company: TLoadCompanyTransferContext | null,
  ): string {
    let paymentInformation;

    if (company) {
      paymentInformation = company.paymentInformation;
    } else {
      paymentInformation = interpreter.paymentInformation;
    }

    switch (paymentInformation.interpreterSystemForPayout) {
      case EPaymentSystem.STRIPE: {
        const isPersonalCard =
          paymentInformation?.stripeInterpreterCardId && paymentInformation.stripeInterpreterCardLast4;

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

    return Boolean(paymentInformation?.stripeInterpreterCardId && paymentInformation.stripeInterpreterCardLast4);
  }

  private determineCurrency(): EPaymentCurrency {
    return EPaymentCurrency.AUD;
  }
}
