import { Injectable } from "@nestjs/common";
import {
  TClientCaptureContext,
  TCompanyCaptureContext,
  TInterpreterCaptureContext,
  TLoadAppointmentCaptureContext,
  TLoadInterpreterCompanyCaptureContext,
  TLoadPaymentCaptureContext,
  TPaymentCaptureContext,
} from "src/modules/payments-analysis/common/types/capture";
import {
  ICapturePaymentContext,
  ICommissionAmountsCaptureContext,
} from "src/modules/payments-analysis/common/interfaces/capture";
import { CaptureContextQueryOptionsService } from "src/modules/payments-analysis/services/capture";
import { findOneOrFailTyped, isInRoles, parseDecimalNumber } from "src/common/utils";
import { InjectRepository } from "@nestjs/typeorm";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { DataSource, Repository } from "typeorm";
import { CORPORATE_CLIENT_ROLES, GST_COEFFICIENT, ONE_HUNDRED } from "src/common/constants";
import { Payment } from "src/modules/payments/entities";
import { EPaymentOperation } from "src/modules/payments-analysis/common/enums/core";
import { EUserRoleName } from "src/modules/users/common/enums";
import { Company } from "src/modules/companies/entities";
import { isCorporateGstPayer } from "src/modules/payments/common/helpers";
import { PaymentsPriceRecalculationService } from "src/modules/payments/services";

@Injectable()
export class CaptureContextService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly paymentsPriceRecalculationService: PaymentsPriceRecalculationService,
    private readonly captureContextQueryOptionsService: CaptureContextQueryOptionsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Loads payment context for capturing authorized payment.
   *
   * Determines corporate context, recalculates final prices, and loads commission amounts
   * for same-company transactions. Executes price calculation in a transaction to ensure consistency.
   *
   * @param appointmentId - The appointment ID to capture payment for
   * @param isSecondAttempt - Whether this is a manual retry after a failed capture attempt
   * @returns Capture payment context with recalculated prices and corporate information
   */
  public async loadPaymentContextForCapture(
    appointmentId: string,
    isSecondAttempt: boolean,
  ): Promise<ICapturePaymentContext> {
    const appointment = await this.loadAppointmentContext(appointmentId);
    const payment = await this.loadPaymentContext(appointmentId);

    const isClientCorporate = this.determineIfClientCorporate(appointment.client);
    const isInterpreterCorporate = this.determineIfInterpreterCorporate(appointment.interpreter);

    const clientCountry = this.determineClientCountry(appointment.client, isClientCorporate, payment);
    const interpreterCountry = await this.determineInterpreterCountry(appointment.interpreter, isInterpreterCorporate);

    const isSameCorporateCompany =
      isClientCorporate && isInterpreterCorporate
        ? this.determineIfSameCorporateCompany(appointment.client, appointment.interpreter)
        : false;

    const commissionAmounts =
      isSameCorporateCompany && payment.company
        ? this.calculateSameCompanyCommissionAmounts(payment, payment.company)
        : null;

    const prices = await this.dataSource.manager.transaction(async (manager) => {
      return await this.paymentsPriceRecalculationService.calculateFinalPaymentPrice(manager, {
        appointment,
        payment,
        isClientCorporate,
        isInterpreterCorporate,
        clientCountry,
        interpreterCountry,
      });
    });

    const updatedPayment = await this.loadPaymentContext(appointmentId);

    return {
      operation: EPaymentOperation.CAPTURE_PAYMENT,
      isSecondAttempt,
      isClientCorporate,
      isInterpreterCorporate,
      clientCountry,
      interpreterCountry,
      isSameCorporateCompany,
      prices,
      appointment,
      commissionAmounts,
      payment: updatedPayment,
    };
  }

  private async loadAppointmentContext(appointmentId: string): Promise<TLoadAppointmentCaptureContext> {
    const queryOptions = this.captureContextQueryOptionsService.loadAppointmentCaptureContextOptions(appointmentId);

    return await findOneOrFailTyped<TLoadAppointmentCaptureContext>(
      appointmentId,
      this.appointmentRepository,
      queryOptions,
    );
  }

  private async loadPaymentContext(appointmentId: string): Promise<TPaymentCaptureContext> {
    const queryOptions = this.captureContextQueryOptionsService.loadPaymentCaptureContextOptions(appointmentId);
    const payment = await findOneOrFailTyped<TLoadPaymentCaptureContext>(
      appointmentId,
      this.paymentRepository,
      queryOptions,
    );

    return {
      ...payment,
      totalAmount: parseDecimalNumber(payment.totalAmount),
      totalGstAmount: parseDecimalNumber(payment.totalGstAmount),
      totalFullAmount: parseDecimalNumber(payment.totalFullAmount),
      estimatedCostAmount: parseDecimalNumber(payment.estimatedCostAmount),
      items: payment.items.map((item) => ({
        ...item,
        amount: parseDecimalNumber(item.amount),
        gstAmount: parseDecimalNumber(item.gstAmount),
        fullAmount: parseDecimalNumber(item.fullAmount),
      })),
      company: payment.company
        ? {
            ...payment.company,
            depositAmount:
              payment.company.depositAmount !== null ? parseDecimalNumber(payment.company.depositAmount) : null,
          }
        : null,
    };
  }

  private async loadCompany(companyId: string): Promise<TLoadInterpreterCompanyCaptureContext> {
    const queryOptions = this.captureContextQueryOptionsService.loadInterpreterCompanyCaptureContextOptions(companyId);

    return await findOneOrFailTyped<TLoadInterpreterCompanyCaptureContext>(
      companyId,
      this.companyRepository,
      queryOptions,
    );
  }

  private calculateSameCompanyCommissionAmounts(
    payment: TPaymentCaptureContext,
    company: TCompanyCaptureContext,
  ): ICommissionAmountsCaptureContext {
    const commissionRate = company.platformCommissionRate / ONE_HUNDRED;
    const originalAmount = payment.totalFullAmount;
    const commissionAmount = originalAmount * commissionRate;
    const refundAmount = originalAmount - commissionAmount;

    const commissionPercent = ((commissionAmount / originalAmount) * ONE_HUNDRED).toFixed(1);
    const refundPercent = ((refundAmount / originalAmount) * ONE_HUNDRED).toFixed(1);

    let commissionWithoutGst = commissionAmount;
    let commissionGstAmount = 0;

    const isGstPayer = isCorporateGstPayer(company.country);

    if (isGstPayer.client) {
      commissionWithoutGst = commissionAmount / GST_COEFFICIENT;
      commissionGstAmount = commissionAmount - commissionWithoutGst;
    }

    return {
      commissionAmount,
      commissionWithoutGst,
      commissionGstAmount,
      refundAmount,
      commissionPercent,
      refundPercent,
    };
  }

  private determineIfClientCorporate(client: TClientCaptureContext): boolean {
    return isInRoles(CORPORATE_CLIENT_ROLES, client.role.name);
  }

  private determineIfInterpreterCorporate(interpreter: TInterpreterCaptureContext | null): boolean {
    return interpreter
      ? interpreter.role.name === EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_IND_INTERPRETER
      : false;
  }

  private determineClientCountry(
    client: TClientCaptureContext,
    isClientCorporate: boolean,
    payment: TPaymentCaptureContext,
  ): string {
    return isClientCorporate && payment.company ? payment.company.country : client.country;
  }

  private async determineInterpreterCountry(
    interpreter: TInterpreterCaptureContext | null,
    isInterpreterCorporate: boolean,
  ): Promise<string | null> {
    if (!interpreter) {
      return null;
    }

    if (!isInterpreterCorporate) {
      return interpreter.country;
    }

    const company = await this.loadCompany(interpreter.operatedByCompanyId);

    return company.country;
  }

  private determineIfSameCorporateCompany(
    client: TClientCaptureContext,
    interpreter: TInterpreterCaptureContext | null,
  ): boolean {
    return interpreter ? client.operatedByMainCorporateCompanyId === interpreter.operatedByCompanyId : false;
  }
}
