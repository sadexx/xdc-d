import { Injectable } from "@nestjs/common";
import {
  TClientAuthorizationCancelContext,
  TLoadAppointmentAuthorizationCancelContext,
  TLoadCompanyAuthorizationCancelContext,
  TLoadPaymentAuthorizationCancelContext,
} from "src/modules/payment-analysis/common/types/authorization-cancel";
import { AuthorizationCancelContextQueryOptionsService } from "src/modules/payment-analysis/services/authorization-cancel";
import { findOneOrFailTyped, isInRoles } from "src/common/utils";
import { InjectRepository } from "@nestjs/typeorm";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { Repository } from "typeorm";
import { CORPORATE_CLIENT_ROLES } from "src/common/constants";
import { COMPANY_LFH_ID } from "src/modules/companies/common/constants/constants";
import { Company } from "src/modules/companies/entities";
import { Payment } from "src/modules/payments-new/entities";
import { IAuthorizationCancelPaymentContext } from "src/modules/payment-analysis/common/interfaces/authorization-cancel";
import { EPaymentOperation } from "src/modules/payment-analysis/common/enums";
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

  public async loadPaymentContextForAuthorizationCancel(
    appointmentId: string,
    isCancelByClient: boolean,
  ): Promise<IAuthorizationCancelPaymentContext> {
    const appointment = await this.loadAppointmentContext(appointmentId);

    const isClientCorporate = this.determineIfClientCorporate(appointment.client);

    const isRestricted = isCancelByClient
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

  private async loadPaymentContext(appointmentId: string): Promise<TLoadPaymentAuthorizationCancelContext> {
    const queryOptions =
      this.authorizationCancelContextQueryOptionsService.loadPaymentAuthorizationCancelContextOptions(appointmentId);

    return await findOneOrFailTyped<TLoadPaymentAuthorizationCancelContext>(
      appointmentId,
      this.paymentRepository,
      queryOptions,
    );
  }

  private async loadCompanyContext(
    client: TClientAuthorizationCancelContext,
  ): Promise<TLoadCompanyAuthorizationCancelContext> {
    const mainCompanyId = client.operatedByMainCorporateCompanyId;
    const shouldLoadMainCompany = mainCompanyId && mainCompanyId !== COMPANY_LFH_ID;
    const companyId = shouldLoadMainCompany ? mainCompanyId : client.operatedByCompanyId;

    const queryOptions =
      this.authorizationCancelContextQueryOptionsService.loadCompanyAuthorizationCancelContextOptions(companyId);

    return await findOneOrFailTyped<TLoadCompanyAuthorizationCancelContext>(
      companyId,
      this.companyRepository,
      queryOptions,
    );
  }

  private determineIfClientCorporate(client: TClientAuthorizationCancelContext): boolean {
    return isInRoles(CORPORATE_CLIENT_ROLES, client.role.name);
  }
}
