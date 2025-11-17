import { Injectable } from "@nestjs/common";
import { AuthorizationRecreateContextQueryOptions } from "src/modules/payments-analysis/services/authorization-recreate";
import { findOneOrFailTyped, isInRoles, parseDecimalNumber, round2 } from "src/common/utils";
import {
  TClientAuthorizationRecreateContext,
  TCompanyAuthorizationRecreateContext,
  TLoadAppointmentAuthorizationRecreateContext,
  TLoadCompanyAuthorizationRecreateContext,
  TLoadOldPaymentAuthorizationRecreateContext,
  TOldPaymentAuthorizationRecreateContext,
} from "src/modules/payments-analysis/common/types/authorization-recreate";
import { InjectRepository } from "@nestjs/typeorm";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { Repository } from "typeorm";
import { CORPORATE_CLIENT_ROLES } from "src/common/constants";
import { COMPANY_LFH_ID } from "src/modules/companies/common/constants/constants";
import { Company } from "src/modules/companies/entities";
import { Payment } from "src/modules/payments/entities";
import { EPaymentOperation } from "src/modules/payments-analysis/common/enums/core";
import { IAuthorizationRecreatePaymentContext } from "src/modules/payments-analysis/common/interfaces/authorization-recreate";
import { PaymentsPriceCalculationService } from "src/modules/payments/services";
import { IPaymentCalculationResult } from "src/modules/payments/common/interfaces/pricing";

@Injectable()
export class AuthorizationRecreateContextService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly authorizationRecreateContextQueryOptionsService: AuthorizationRecreateContextQueryOptions,
    private readonly paymentPriceCalculationService: PaymentsPriceCalculationService,
  ) {}

  /**
   * Loads payment context for recreating authorization after appointment rescheduling.
   *
   * Calculates new prices and compares with the old payment to determine if price has changed.
   * Used when an appointment is rescheduled and payment needs to be reauthorized.
   *
   * @param appointmentId - The new appointment ID
   * @param oldAppointmentId - The original appointment ID to compare pricing against
   * @returns Authorization recreate context with price change information
   */
  public async loadPaymentContextForAuthorizationRecreate(
    appointmentId: string,
    oldAppointmentId: string,
  ): Promise<IAuthorizationRecreatePaymentContext> {
    const appointment = await this.loadAppointmentContext(appointmentId);

    const isClientCorporate = this.determineIfClientCorporate(appointment.client);

    const company = isClientCorporate ? await this.loadCompanyContext(appointment.client) : null;

    const country = this.determineCountry(appointment.client, isClientCorporate, company);

    const prices = await this.paymentPriceCalculationService.calculatePaymentStartPrice({
      appointment,
      isClientCorporate,
      country,
    });

    const payment = await this.loadOldPaymentContext(oldAppointmentId);

    const hasPriceChanged = this.checkIfPriceChanged(payment, prices);

    return {
      operation: EPaymentOperation.AUTHORIZATION_RECREATE_PAYMENT,
      appointment,
      isClientCorporate,
      hasPriceChanged,
      prices,
      payment,
      company,
    };
  }

  private async loadAppointmentContext(appointmentId: string): Promise<TLoadAppointmentAuthorizationRecreateContext> {
    const queryOptions =
      this.authorizationRecreateContextQueryOptionsService.loadAppointmentAuthorizationRecreateContextOptions(
        appointmentId,
      );

    return await findOneOrFailTyped<TLoadAppointmentAuthorizationRecreateContext>(
      appointmentId,
      this.appointmentRepository,
      queryOptions,
    );
  }

  private async loadCompanyContext(
    client: TClientAuthorizationRecreateContext,
  ): Promise<TCompanyAuthorizationRecreateContext> {
    const mainCompanyId = client.operatedByMainCorporateCompanyId;
    const shouldLoadMainCompany = mainCompanyId && mainCompanyId !== COMPANY_LFH_ID;
    const companyId = shouldLoadMainCompany ? mainCompanyId : client.operatedByCompanyId;

    const queryOptions =
      this.authorizationRecreateContextQueryOptionsService.loadCompanyAuthorizationRecreateContextOptions(companyId);
    const company = await findOneOrFailTyped<TLoadCompanyAuthorizationRecreateContext>(
      companyId,
      this.companyRepository,
      queryOptions,
    );

    return {
      ...company,
      depositAmount: company.depositAmount !== null ? parseDecimalNumber(company.depositAmount) : null,
    };
  }

  private async loadOldPaymentContext(oldAppointmentId: string): Promise<TOldPaymentAuthorizationRecreateContext> {
    const queryOptions =
      this.authorizationRecreateContextQueryOptionsService.loadOldPaymentAuthorizationRecreateContextOptions(
        oldAppointmentId,
      );

    const oldPayment = await findOneOrFailTyped<TLoadOldPaymentAuthorizationRecreateContext>(
      oldAppointmentId,
      this.paymentRepository,
      queryOptions,
    );

    return {
      ...oldPayment,
      totalAmount: parseDecimalNumber(oldPayment.totalAmount),
      totalGstAmount: parseDecimalNumber(oldPayment.totalGstAmount),
      items: oldPayment.items.map((item) => ({
        ...item,
        fullAmount: parseDecimalNumber(item.fullAmount),
      })),
    };
  }

  private determineIfClientCorporate(client: TClientAuthorizationRecreateContext): boolean {
    return isInRoles(CORPORATE_CLIENT_ROLES, client.role.name);
  }

  private determineCountry(
    client: TClientAuthorizationRecreateContext,
    isClientCorporate: boolean,
    company: TCompanyAuthorizationRecreateContext | null,
  ): string {
    return isClientCorporate && company ? company.country : client.country;
  }

  private checkIfPriceChanged(
    oldPayment: TOldPaymentAuthorizationRecreateContext | null,
    newPrices: IPaymentCalculationResult,
  ): boolean {
    if (!oldPayment) {
      return true;
    }

    const amountChanged = round2(oldPayment.totalAmount) !== round2(newPrices.clientAmount);
    const gstAmountChanged = round2(oldPayment.totalGstAmount) !== round2(newPrices.clientGstAmount);

    return amountChanged || gstAmountChanged;
  }
}
