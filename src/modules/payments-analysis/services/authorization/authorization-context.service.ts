import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { addMinutes, differenceInDays, differenceInMinutes } from "date-fns";
import { isInRoles, findOneOrFailTyped, findOneTyped, parseDecimalNumber } from "src/common/utils";
import {
  CORPORATE_CLIENT_ROLES,
  FIFTEEN_PERCENT_MULTIPLIER,
  NUMBER_OF_MINUTES_IN_DAY,
  NUMBER_OF_MINUTES_IN_HALF_HOUR,
  NUMBER_OF_MINUTES_IN_SIX_HOURS,
  TEN_PERCENT_MULTIPLIER,
} from "src/common/constants";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { Company } from "src/modules/companies/entities";
import { Payment, IncomingPaymentWaitList } from "src/modules/payments/entities";
import { EPaymentCurrency } from "src/modules/payments/common/enums/core";
import { EPaymentOperation } from "src/modules/payments-analysis/common/enums/core";
import {
  IAuthorizationContextOptions,
  IAuthorizationPaymentContext,
  ICompanyAuthorizationContext,
  IDepositChargeAuthorizationContext,
  ITimingAuthorizationContext,
  IWaitListAuthorizationContext,
} from "src/modules/payments-analysis/common/interfaces/authorization";
import {
  TClientAuthorizationContext,
  TCompanySuperAdminAuthorizationContext,
  TExistingPaymentAuthorizationContext,
  TLoadAppointmentAuthorizationContext,
  TLoadCompanyAuthorizationContext,
  TLoadExistingPaymentAuthorizationContext,
} from "src/modules/payments-analysis/common/types/authorization";
import { WAIT_LIST_REDIRECT_THRESHOLD_DAYS } from "src/modules/payments-analysis/common/constants/authorization";
import { AuthorizationContextQueryOptionsService } from "src/modules/payments-analysis/services/authorization";
import { EUserRoleName } from "src/modules/users/common/enums";
import { COMPANY_LFH_ID } from "src/modules/companies/common/constants/constants";
import { PAYMENT_AUTHORIZATION_CUTOFF_MINUTES } from "src/modules/payments/common/constants";
import { PaymentsPriceCalculationService } from "src/modules/payments/services";
import { IPaymentCalculationResult } from "src/modules/payments/common/interfaces/pricing";

@Injectable()
export class AuthorizationContextService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(IncomingPaymentWaitList)
    private readonly incomingPaymentWaitListRepository: Repository<IncomingPaymentWaitList>,
    private readonly authorizationContextQueryOptionsService: AuthorizationContextQueryOptionsService,
    private readonly paymentPriceCalculationService: PaymentsPriceCalculationService,
  ) {}

  /**
   * Loads and constructs the complete payment authorization context for an appointment.
   *
   * This method orchestrates the loading of all necessary data to determine payment authorization
   * strategy, including client type, pricing, deposit charges, wait list status, and timing constraints.
   *
   * @param appointmentId - The unique identifier of the appointment to authorize payment for
   * @param options - Configuration options for authorization context
   * @returns Complete authorization payment context with all required data for payment processing
   */
  public async loadPaymentContextForAuthorization(
    appointmentId: string,
    options: IAuthorizationContextOptions,
  ): Promise<IAuthorizationPaymentContext> {
    const { isShortTimeSlot, initialPrices, additionalBlockDuration } = options;

    const appointment = await this.loadAppointmentContext(appointmentId);

    const isClientCorporate = this.determineIfClientCorporate(appointment.client);

    const currency = this.determineCurrency();

    const timingContext = this.calculateTimingContext(appointment);

    const waitListContext = await this.loadWaitListContext(appointment, isClientCorporate);

    const companyContext = isClientCorporate ? await this.loadCompanyContext(appointment.client) : null;

    const paymentMethodInfo = this.determinePaymentMethodInfo(appointment.client, companyContext);

    if (waitListContext.shouldRedirectToWaitList) {
      return {
        operation: EPaymentOperation.AUTHORIZE_PAYMENT,
        appointment,
        isClientCorporate,
        isShortTimeSlot,
        additionalBlockDuration: 0,
        paymentMethodInfo,
        currency,
        timingContext,
        waitListContext,
        existingPayment: null,
        companyContext: null,
        prices: null,
        depositChargeContext: null,
      };
    }

    const country = this.determineCountry(appointment.client, isClientCorporate, companyContext);

    const existingPayment = await this.loadExistingPaymentContext(appointmentId);

    const prices = !initialPrices
      ? await this.calculatePaymentPrices(appointment, isClientCorporate, country, options)
      : initialPrices;

    const depositChargeContext =
      isClientCorporate && companyContext ? this.calculateDepositContext(companyContext, prices) : null;

    const paymentOperation = this.determinePaymentOperation(options);

    return {
      operation: paymentOperation,
      appointment,
      isClientCorporate,
      isShortTimeSlot,
      additionalBlockDuration: additionalBlockDuration ?? 0,
      paymentMethodInfo,
      currency,
      timingContext,
      waitListContext,
      existingPayment,
      companyContext,
      prices,
      depositChargeContext,
    };
  }

  private async loadAppointmentContext(appointmentId: string): Promise<TLoadAppointmentAuthorizationContext> {
    const queryOptions =
      this.authorizationContextQueryOptionsService.loadAppointmentAuthorizationContextOptions(appointmentId);

    return await findOneOrFailTyped<TLoadAppointmentAuthorizationContext>(
      appointmentId,
      this.appointmentRepository,
      queryOptions,
    );
  }

  private async loadWaitListContext(
    appointment: TLoadAppointmentAuthorizationContext,
    isClientCorporate: boolean,
  ): Promise<IWaitListAuthorizationContext> {
    const effectiveBusinessStartDate = appointment.businessStartTime ?? appointment.scheduledStartTime;
    const daysBeforeAppointment = differenceInDays(effectiveBusinessStartDate, new Date());
    const shouldRedirectToWaitList = !isClientCorporate && daysBeforeAppointment > WAIT_LIST_REDIRECT_THRESHOLD_DAYS;

    if (!shouldRedirectToWaitList) {
      return { shouldRedirectToWaitList: false, existingWaitListRecord: null };
    }

    const queryOptions = this.authorizationContextQueryOptionsService.loadWaitListAuthorizationContextOptions(
      appointment.id,
    );
    const existingWaitListRecord = await findOneTyped<IncomingPaymentWaitList>(
      this.incomingPaymentWaitListRepository,
      queryOptions,
    );

    return { shouldRedirectToWaitList, existingWaitListRecord };
  }

  private async loadCompanyContext(client: TClientAuthorizationContext): Promise<ICompanyAuthorizationContext> {
    const mainCompanyId = client.operatedByMainCorporateCompanyId;
    const shouldLoadMainCompany = mainCompanyId && mainCompanyId !== COMPANY_LFH_ID;
    const companyId = shouldLoadMainCompany ? mainCompanyId : client.operatedByCompanyId;

    const company = await this.loadCompany(companyId);
    const superAdminRole = await this.loadCompanySuperAdminRole(company);

    return {
      company: {
        ...company,
        depositAmount: company.depositAmount !== null ? parseDecimalNumber(company.depositAmount) : null,
        depositDefaultChargeAmount:
          company.depositDefaultChargeAmount !== null ? parseDecimalNumber(company.depositDefaultChargeAmount) : null,
      },
      superAdminRole,
    };
  }

  private async loadCompany(companyId: string): Promise<TLoadCompanyAuthorizationContext> {
    const queryOptions = this.authorizationContextQueryOptionsService.loadCompanyAuthorizationContextOptions(companyId);

    return await findOneOrFailTyped<TLoadCompanyAuthorizationContext>(companyId, this.companyRepository, queryOptions);
  }

  private async loadCompanySuperAdminRole(
    company: TLoadCompanyAuthorizationContext,
  ): Promise<TCompanySuperAdminAuthorizationContext | null> {
    const { superAdmin } = company;
    const superAdminRole = superAdmin.userRoles.find(
      (userRole) =>
        userRole.role.name === EUserRoleName.CORPORATE_CLIENTS_SUPER_ADMIN ||
        userRole.role.name === EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_SUPER_ADMIN,
    );

    return superAdminRole ?? null;
  }

  private async loadExistingPaymentContext(
    appointmentId: string,
  ): Promise<TExistingPaymentAuthorizationContext | null> {
    const queryOptions =
      this.authorizationContextQueryOptionsService.loadExistingPaymentAuthorizationContextOptions(appointmentId);
    const existingPayment = await findOneTyped<TLoadExistingPaymentAuthorizationContext>(
      this.paymentRepository,
      queryOptions,
    );

    if (!existingPayment) {
      return null;
    }

    return {
      ...existingPayment,
      totalAmount: parseDecimalNumber(existingPayment.totalAmount),
      totalGstAmount: parseDecimalNumber(existingPayment.totalGstAmount),
      totalFullAmount: parseDecimalNumber(existingPayment.totalFullAmount),
    };
  }

  private calculateTimingContext(appointment: TLoadAppointmentAuthorizationContext): ITimingAuthorizationContext {
    const currentDate = new Date();
    const scheduledStartTime = appointment.scheduledStartTime;

    const paymentCutoffTime = addMinutes(currentDate, PAYMENT_AUTHORIZATION_CUTOFF_MINUTES);
    const isTooLateForPayment = scheduledStartTime <= paymentCutoffTime;

    const minutesBetweenCreationAndStart = differenceInMinutes(scheduledStartTime, appointment.creationDate);
    const isCreatedMoreThan24HoursBeforeStart = minutesBetweenCreationAndStart >= NUMBER_OF_MINUTES_IN_DAY;
    const isCreatedMoreThan6HoursBeforeStart = minutesBetweenCreationAndStart >= NUMBER_OF_MINUTES_IN_SIX_HOURS;

    const minutesUntilStart = differenceInMinutes(scheduledStartTime, currentDate);
    const isWithin24AndHalfHourWindow = minutesUntilStart < NUMBER_OF_MINUTES_IN_DAY + NUMBER_OF_MINUTES_IN_HALF_HOUR;

    return {
      isTooLateForPayment,
      isCreatedMoreThan24HoursBeforeStart,
      isCreatedMoreThan6HoursBeforeStart,
      isWithin24AndHalfHourWindow,
    };
  }

  private async calculatePaymentPrices(
    appointment: TLoadAppointmentAuthorizationContext,
    isClientCorporate: boolean,
    country: string,
    options: IAuthorizationContextOptions,
  ): Promise<IPaymentCalculationResult> {
    const { additionalBlockDuration } = options;

    if (additionalBlockDuration) {
      const isInterpreterCorporate =
        appointment.interpreter?.role.name === EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_IND_INTERPRETER;

      return this.paymentPriceCalculationService.calculatePaymentAdditionalBlockPrice({
        appointment,
        isClientCorporate,
        isInterpreterCorporate,
        additionalBlockDuration,
        country,
      });
    } else {
      return this.paymentPriceCalculationService.calculatePaymentStartPrice({
        appointment,
        isClientCorporate,
        country,
      });
    }
  }

  private calculateDepositContext(
    companyContext: ICompanyAuthorizationContext,
    prices: IPaymentCalculationResult,
  ): IDepositChargeAuthorizationContext {
    const { company } = companyContext;
    const depositAmount = company.depositAmount ?? 0;
    const depositDefaultChargeAmount = company.depositDefaultChargeAmount ?? 0;

    const isInsufficientFunds = depositAmount < prices.clientFullAmount;

    if (!depositDefaultChargeAmount || !depositAmount || isInsufficientFunds) {
      return {
        depositAmount,
        depositDefaultChargeAmount,
        isInsufficientFunds,
        balanceAfterCharge: 0,
        isBalanceBelowTenPercent: false,
        isBalanceBelowFifteenPercent: false,
      };
    }

    const balanceAfterCharge = depositAmount - prices.clientFullAmount;
    const tenPercentThreshold = depositDefaultChargeAmount * TEN_PERCENT_MULTIPLIER;
    const fifteenPercentThreshold = depositDefaultChargeAmount * FIFTEEN_PERCENT_MULTIPLIER;

    const isBalanceBelowTenPercent = depositDefaultChargeAmount > 0 && balanceAfterCharge <= tenPercentThreshold;
    const isBalanceBelowFifteenPercent =
      depositDefaultChargeAmount > 0 && balanceAfterCharge <= fifteenPercentThreshold;

    return {
      depositAmount,
      depositDefaultChargeAmount,
      isInsufficientFunds,
      balanceAfterCharge,
      isBalanceBelowTenPercent,
      isBalanceBelowFifteenPercent,
    };
  }

  private determineIfClientCorporate(client: TClientAuthorizationContext): boolean {
    return isInRoles(CORPORATE_CLIENT_ROLES, client.role.name);
  }

  private determinePaymentMethodInfo(
    client: TClientAuthorizationContext,
    companyContext: ICompanyAuthorizationContext | null,
  ): string {
    if (companyContext) {
      return `Deposit of company ${companyContext.company.platformId}`;
    }

    return `Credit Card ${client.paymentInformation?.stripeClientLastFour}`;
  }

  private determineCurrency(): EPaymentCurrency {
    return EPaymentCurrency.AUD;
  }

  private determineCountry(
    client: TClientAuthorizationContext,
    isClientCorporate: boolean,
    companyContext: ICompanyAuthorizationContext | null,
  ): string {
    return isClientCorporate && companyContext ? companyContext.company.country : client.country;
  }

  private determinePaymentOperation(
    options: IAuthorizationContextOptions,
  ): EPaymentOperation.AUTHORIZE_PAYMENT | EPaymentOperation.AUTHORIZE_ADDITIONAL_BLOCK_PAYMENT {
    const { additionalBlockDuration } = options;

    return additionalBlockDuration
      ? EPaymentOperation.AUTHORIZE_ADDITIONAL_BLOCK_PAYMENT
      : EPaymentOperation.AUTHORIZE_PAYMENT;
  }
}
