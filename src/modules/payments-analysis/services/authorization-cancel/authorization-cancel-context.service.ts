import { Injectable } from "@nestjs/common";
import {
  TClientAuthorizationCancelContext,
  TCompanyAuthorizationCancelContext,
  TLoadAppointmentAuthorizationCancelContext,
  TLoadCompanyAuthorizationCancelContext,
  TLoadPaymentAuthorizationCancelContext,
  TPaymentAuthorizationCancelContext,
} from "src/modules/payments-analysis/common/types/authorization-cancel";
import { AuthorizationCancelContextQueryOptionsService } from "src/modules/payments-analysis/services/authorization-cancel";
import { findOneOrFailTyped, isInRoles, parseDecimalNumber } from "src/common/utils";
import { InjectRepository } from "@nestjs/typeorm";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { Repository } from "typeorm";
import { CORPORATE_CLIENT_ROLES } from "src/common/constants";
import { COMPANY_LFH_ID } from "src/modules/companies/common/constants/constants";
import { Company } from "src/modules/companies/entities";
import { Payment } from "src/modules/payments/entities";
import { IAuthorizationCancelPaymentContext } from "src/modules/payments-analysis/common/interfaces/authorization-cancel";
import { EPaymentOperation } from "src/modules/payments-analysis/common/enums/core";
import { AppointmentSharedService } from "src/modules/appointments/shared/services";

@Injectable()
export class AuthorizationCancelContextService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly authorizationCancelContextQueryOptionsService: AuthorizationCancelContextQueryOptionsService,
    private readonly appointmentSharedService: AppointmentSharedService,
  ) {}

  /**
   * Loads payment context for authorization cancellation.
   *
   * Gathers appointment, payment, and company data to determine if a payment authorization
   * can be cancelled. Checks time restrictions if cancelled by client.
   *
   * @param appointmentId - The appointment ID to cancel authorization for
   * @param isCancelledByClient - Whether the cancellation was initiated by the client
   * @returns Authorization cancel payment context with restriction status
   */
  public async loadPaymentContextForAuthorizationCancel(
    appointmentId: string,
    isCancelledByClient: boolean,
  ): Promise<IAuthorizationCancelPaymentContext> {
    const appointment = await this.loadAppointmentContext(appointmentId);

    const isClientCorporate = this.determineIfClientCorporate(appointment.client);

    const isRestricted = isCancelledByClient
      ? this.appointmentSharedService.isAppointmentCancellationRestrictedByTimeLimits(appointment)
      : false;

    const payment = await this.loadPaymentContext(appointmentId);

    const company = isClientCorporate ? await this.loadCompanyContext(appointment.client) : null;

    return {
      operation: EPaymentOperation.AUTHORIZATION_CANCEL_PAYMENT,
      appointment,
      isClientCorporate,
      isRestricted,
      payment,
      company,
    };
  }

  private async loadAppointmentContext(appointmentId: string): Promise<TLoadAppointmentAuthorizationCancelContext> {
    const queryOptions =
      this.authorizationCancelContextQueryOptionsService.loadAppointmentAuthorizationCancelContextOptions(
        appointmentId,
      );

    return await findOneOrFailTyped<TLoadAppointmentAuthorizationCancelContext>(
      appointmentId,
      this.appointmentRepository,
      queryOptions,
    );
  }

  private async loadPaymentContext(appointmentId: string): Promise<TPaymentAuthorizationCancelContext> {
    const queryOptions =
      this.authorizationCancelContextQueryOptionsService.loadPaymentAuthorizationCancelContextOptions(appointmentId);

    const payment = await findOneOrFailTyped<TLoadPaymentAuthorizationCancelContext>(
      appointmentId,
      this.paymentRepository,
      queryOptions,
    );

    return {
      ...payment,
      items: payment.items.map((item) => ({
        ...item,
        fullAmount: parseDecimalNumber(item.fullAmount),
      })),
    };
  }

  private async loadCompanyContext(
    client: TClientAuthorizationCancelContext,
  ): Promise<TCompanyAuthorizationCancelContext> {
    const mainCompanyId = client.operatedByMainCorporateCompanyId;
    const shouldLoadMainCompany = mainCompanyId && mainCompanyId !== COMPANY_LFH_ID;
    const companyId = shouldLoadMainCompany ? mainCompanyId : client.operatedByCompanyId;

    const queryOptions =
      this.authorizationCancelContextQueryOptionsService.loadCompanyAuthorizationCancelContextOptions(companyId);
    const company = await findOneOrFailTyped<TLoadCompanyAuthorizationCancelContext>(
      companyId,
      this.companyRepository,
      queryOptions,
    );

    return {
      ...company,
      depositAmount: company.depositAmount !== null ? parseDecimalNumber(company.depositAmount) : null,
    };
  }

  private determineIfClientCorporate(client: TClientAuthorizationCancelContext): boolean {
    return isInRoles(CORPORATE_CLIENT_ROLES, client.role.name);
  }
}
