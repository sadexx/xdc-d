import { Injectable } from "@nestjs/common";
import {
  TClientCaptureContext,
  TInterpreterCaptureContext,
  TLoadAppointmentCaptureContext,
  TLoadInterpreterCompanyCaptureContext,
  TLoadPaymentCaptureContext,
} from "src/modules/payment-analysis/common/types/capture";
import {
  ICapturePaymentContext,
  ICorporateCaptureContext,
} from "src/modules/payment-analysis/common/interfaces/capture";
import { CaptureContextQueryOptionsService } from "src/modules/payment-analysis/services/capture";
import { findOneOrFailTyped, isInRoles } from "src/common/utils";
import { InjectRepository } from "@nestjs/typeorm";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { DataSource, Repository } from "typeorm";
import { CORPORATE_CLIENT_ROLES } from "src/common/constants";
import { Payment } from "src/modules/payments-new/entities";
import { PaymentsPriceRecalculationService } from "src/modules/payments-new/services";
import { EPaymentOperation } from "src/modules/payment-analysis/common/enums";
import { EUserRoleName } from "src/modules/users/common/enums";
import { Company } from "src/modules/companies/entities";

@Injectable()
export class CaptureContextService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly captureContextQueryOptionsService: CaptureContextQueryOptionsService,
    private readonly paymentsPriceRecalculationService: PaymentsPriceRecalculationService,
    private readonly dataSource: DataSource,
  ) {}

  public async loadPaymentContextForCapture(appointmentId: string): Promise<ICapturePaymentContext> {
    const appointment = await this.loadAppointmentContext(appointmentId);
    const payment = await this.loadPaymentContext(appointmentId);

    const corporateContext = await this.determineCorporateContext(appointment, payment);
    const prices = await this.dataSource.manager.transaction(async (manager) => {
      return await this.paymentsPriceRecalculationService.calculateFinalPaymentPrice(
        manager,
        appointment,
        payment,
        corporateContext,
      );
    });
    const updatedPayment = await this.loadPaymentContext(appointmentId);

    return {
      operation: EPaymentOperation.CAPTURE_PAYMENT,
      prices,
      corporateContext,
      appointment,
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

  private async loadPaymentContext(appointmentId: string): Promise<TLoadPaymentCaptureContext> {
    const queryOptions = this.captureContextQueryOptionsService.loadPaymentCaptureContextOptions(appointmentId);

    return await findOneOrFailTyped<TLoadPaymentCaptureContext>(appointmentId, this.paymentRepository, queryOptions);
  }

  private async loadCompany(companyId: string): Promise<TLoadInterpreterCompanyCaptureContext> {
    const queryOptions = this.captureContextQueryOptionsService.loadInterpreterCompanyCaptureContextOptions(companyId);

    return await findOneOrFailTyped<TLoadInterpreterCompanyCaptureContext>(
      companyId,
      this.companyRepository,
      queryOptions,
    );
  }

  private async determineCorporateContext(
    appointment: TLoadAppointmentCaptureContext,
    payment: TLoadPaymentCaptureContext,
  ): Promise<ICorporateCaptureContext> {
    const { client, interpreter } = appointment;

    const isClientCorporate = this.determineIfClientCorporate(client);
    const isInterpreterCorporate = this.determineIfInterpreterCorporate(interpreter);

    const clientCountry = this.determineClientCountry(client, isClientCorporate, payment);
    const interpreterCountry = await this.determineInterpreterCountry(interpreter, isInterpreterCorporate);

    const isSameCorporateCompany = this.determineIfSameCorporateCompany(client, interpreter);

    return { isClientCorporate, isInterpreterCorporate, clientCountry, interpreterCountry, isSameCorporateCompany };
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
    payment: TLoadPaymentCaptureContext,
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
