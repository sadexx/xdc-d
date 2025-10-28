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
import { EPaymentCurrency } from "src/modules/payments-new/common/enums";
import { EPaymentOperation } from "src/modules/payment-analysis/common/enums";

@Injectable()
export class TransferContextService {
  private readonly lokiLogger = new LokiLogger(TransferContextService.name);
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly transferContextQueryOptionsService: TransferContextQueryOptionsService,
  ) {}

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
      this.appointmentRepository,
      queryOptions.incomingPayment,
    );
    const outcomingPayment = await findOneOrFailTyped<TLoadPaymentTransferContext>(
      appointmentId,
      this.appointmentRepository,
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

    if (
      role.name === EUserRoleName.IND_LANGUAGE_BUDDY_INTERPRETER &&
      country === EExtCountry.AUSTRALIA &&
      (!abnCheck || !hasActiveAbn)
    ) {
      adjustedInterpreterAmount = round2(prices.interpreterAmount / DIVIDER_FOR_LANG_BUDDIES_WITHOUT_ABN);
    }

    return {
      interpreterAmount: adjustedInterpreterAmount,
      interpreterGstAmount: prices.interpreterGstAmount,
      interpreterFullAmount: prices.interpreterFullAmount,
    };
  }

  private determineIfInterpreterCorporate(interpreter: TInterpreterTransferContext): boolean {
    return interpreter.role.name === EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_IND_INTERPRETER;
  }

  private determineCurrency(): EPaymentCurrency {
    return EPaymentCurrency.AUD;
  }
}
