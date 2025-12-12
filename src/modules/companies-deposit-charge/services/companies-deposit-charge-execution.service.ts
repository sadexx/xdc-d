import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, EntityManager, In, Repository } from "typeorm";
import { findManyTyped, parseDecimalNumber } from "src/common/utils";
import { GST_COEFFICIENT } from "src/common/constants";
import {
  EPaymentCurrency,
  EPaymentCustomerType,
  EPaymentDirection,
  EPaymentFailedReason,
  EPaymentStatus,
  EPaymentSystem,
} from "src/modules/payments/common/enums/core";
import { Payment } from "src/modules/payments/entities";
import { PaymentsExternalOperationsService, PaymentsManagementService } from "src/modules/payments/services";
import { EUserRoleName } from "src/modules/users/common/enums";
import { UNFINISHED_DEPOSIT_CHARGE_STATUSES } from "src/modules/companies-deposit-charge/common/constants";
import { ECompaniesDepositChargeErrorCodes } from "src/modules/companies-deposit-charge/common/enums";
import {
  ICalculateDepositChargeGstAmounts,
  ICreateDepositChargePaymentRecordData,
  IHandleDepositChargeFailureData,
} from "src/modules/companies-deposit-charge/common/interfaces";
import {
  ChargeCompaniesDepositQuery,
  TChargeCompaniesDeposit,
  TChargeCompaniesDepositValidatedCompany,
  TLoadChargeCompaniesDeposit,
} from "src/modules/companies-deposit-charge/common/types";
import { CompanyDepositCharge } from "src/modules/companies-deposit-charge/entities";
import { CompaniesDepositChargeNotificationService } from "src/modules/companies-deposit-charge/services";
import { isCorporateGstPayer } from "src/modules/payments/common/helpers";
import { ICreatePaymentRecordResult } from "src/modules/payments/common/interfaces/management";
import { IPaymentCalculationResult } from "src/modules/payments/common/interfaces/pricing";

@Injectable()
export class CompaniesDepositChargeExecutionService {
  constructor(
    @InjectRepository(CompanyDepositCharge)
    private readonly companyDepositChargeRepository: Repository<CompanyDepositCharge>,
    private readonly companiesDepositChargeNotificationService: CompaniesDepositChargeNotificationService,
    private readonly paymentsManagementService: PaymentsManagementService,
    private readonly paymentsExternalOperationsService: PaymentsExternalOperationsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Executes pending deposit charges for all active companies.
   * Processes each charge in a separate transaction: validates company, checks thresholds,
   * attempts Stripe charge, creates payment record, and handles failures/notifications.
   * Continues on individual failures without stopping the batch.
   *
   * @returns Promise<void> - Resolves on batch completion.
   * @throws {BadRequestException} - If validation fails for a specific charge (logged and skipped).
   */
  public async executePendingDepositCharges(): Promise<void> {
    const depositCharges = await findManyTyped<TLoadChargeCompaniesDeposit[]>(this.companyDepositChargeRepository, {
      select: ChargeCompaniesDepositQuery.select,
      where: { company: { isActive: true } },
      relations: ChargeCompaniesDepositQuery.relations,
    });
    const currency = this.determineCurrency();

    for (const depositCharge of depositCharges) {
      const transformedCharge = this.transformDepositChargeToNumbers(depositCharge);
      await this.dataSource.transaction(async (manager) => {
        await this.chargeCompanyDeposit(manager, transformedCharge, currency);
      });
    }
  }

  private async chargeCompanyDeposit(
    manager: EntityManager,
    depositCharge: TChargeCompaniesDeposit,
    currency: EPaymentCurrency,
  ): Promise<void> {
    const { company } = depositCharge;
    const validatedCompany = await this.validateCompanyForChargeExecution(manager, company);

    const superAdminRole = validatedCompany.superAdmin.userRoles.find(
      (userRole) =>
        userRole.role.name === EUserRoleName.CORPORATE_CLIENTS_SUPER_ADMIN ||
        userRole.role.name === EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_SUPER_ADMIN,
    );

    if (!superAdminRole) {
      throw new BadRequestException(ECompaniesDepositChargeErrorCodes.PAYMENT_INFO_SUPER_ADMIN_ROLE_NOT_FOUND);
    }

    const calculatedAmounts = this.calculateDepositChargeGstAmounts(
      depositCharge.depositChargeAmount,
      validatedCompany,
    );

    const externalOperationResult = await this.paymentsExternalOperationsService.attemptStripeDepositCharge(
      depositCharge,
      validatedCompany,
      currency,
      calculatedAmounts.totalFullAmount,
    );

    const { payment } = await this.createDepositChargePaymentRecord(manager, {
      externalOperationResult,
      calculatedAmounts,
      company: validatedCompany,
      currency,
    });

    if (externalOperationResult.status === EPaymentStatus.AUTHORIZATION_FAILED) {
      return await this.handleDepositChargeFailure({
        company: validatedCompany,
        calculatedAmounts,
        currency,
        payment,
        superAdminRole,
      });
    }

    await manager.getRepository(CompanyDepositCharge).delete({ id: depositCharge.id });
  }

  private async validateCompanyForChargeExecution(
    manager: EntityManager,
    company: TChargeCompaniesDeposit["company"],
  ): Promise<TChargeCompaniesDepositValidatedCompany> {
    const unfinishedPaymentsCount = await manager.getRepository(Payment).count({
      where: {
        company: { id: company.id },
        isDepositCharge: true,
        direction: EPaymentDirection.INCOMING,
        items: { status: In(UNFINISHED_DEPOSIT_CHARGE_STATUSES) },
      },
    });

    if (unfinishedPaymentsCount > 0) {
      throw new BadRequestException(ECompaniesDepositChargeErrorCodes.CHARGE_UNFINISHED_CHARGE_EXISTS);
    }

    if (!company.paymentInformation) {
      await this.handleValidationError(company);
      throw new BadRequestException(ECompaniesDepositChargeErrorCodes.PAYMENT_INFO_NOT_FILLED);
    }

    if (
      !company.paymentInformation.stripeClientPaymentMethodId ||
      !company.paymentInformation.stripeClientAccountId ||
      !company.paymentInformation.stripeClientLastFour
    ) {
      await this.handleValidationError(company);
      throw new BadRequestException(ECompaniesDepositChargeErrorCodes.PAYMENT_INFO_STRIPE_NOT_FILLED);
    }

    if (!company.adminEmail) {
      await this.handleValidationError(company);
      throw new BadRequestException(ECompaniesDepositChargeErrorCodes.PAYMENT_INFO_ADMIN_EMAIL_NOT_FILLED);
    }

    if (!company.superAdmin) {
      await this.handleValidationError(company);
      throw new BadRequestException(ECompaniesDepositChargeErrorCodes.PAYMENT_INFO_ADMIN_INFO_NOT_FILLED);
    }

    return company as TChargeCompaniesDepositValidatedCompany;
  }

  private calculateDepositChargeGstAmounts(
    totalFullAmount: number,
    company: TChargeCompaniesDepositValidatedCompany,
  ): ICalculateDepositChargeGstAmounts {
    let amount = totalFullAmount;
    let totalGstAmount = 0;

    const isGstPayer = isCorporateGstPayer(company.country);

    if (isGstPayer.client && totalFullAmount > 0) {
      amount = totalFullAmount / GST_COEFFICIENT;
      totalGstAmount = totalFullAmount - amount;
    }

    return { totalAmount: amount, totalGstAmount, totalFullAmount };
  }

  private async createDepositChargePaymentRecord(
    manager: EntityManager,
    data: ICreateDepositChargePaymentRecordData,
  ): Promise<ICreatePaymentRecordResult> {
    const { externalOperationResult, calculatedAmounts, company, currency } = data;
    const determinedPaymentMethodInfo = `Bank Account ${company.paymentInformation.stripeClientLastFour}`;

    return await this.paymentsManagementService.createPaymentRecord(manager, {
      direction: EPaymentDirection.INCOMING,
      customerType: EPaymentCustomerType.CORPORATE,
      system: EPaymentSystem.STRIPE,
      status: externalOperationResult.status,
      isDepositCharge: true,
      paymentMethodInfo: determinedPaymentMethodInfo,
      externalId: externalOperationResult.paymentIntentId,
      note: externalOperationResult.error ?? "Deposit charge",
      company,
      currency,
      prices: {
        clientAmount: calculatedAmounts.totalAmount,
        clientGstAmount: calculatedAmounts.totalGstAmount,
        clientFullAmount: calculatedAmounts.totalFullAmount,
      } as IPaymentCalculationResult,
    });
  }

  private async handleDepositChargeFailure(data: IHandleDepositChargeFailureData): Promise<void> {
    const { company, calculatedAmounts, currency, payment, superAdminRole } = data;
    await this.companiesDepositChargeNotificationService.sendDepositChargeFailedNotification({
      company,
      calculatedAmounts,
      currency,
      payment,
      superAdminRole,
    });
  }

  private async handleValidationError(company: TChargeCompaniesDeposit["company"]): Promise<void> {
    await this.companiesDepositChargeNotificationService.sendEarlyFailureNotification(
      company,
      EPaymentFailedReason.INFO_NOT_FILLED,
    );
  }

  private determineCurrency(): EPaymentCurrency {
    return EPaymentCurrency.AUD;
  }

  private transformDepositChargeToNumbers(depositCharge: TLoadChargeCompaniesDeposit): TChargeCompaniesDeposit {
    const { company } = depositCharge;

    return {
      ...depositCharge,
      depositChargeAmount: parseDecimalNumber(depositCharge.depositChargeAmount),
      company: {
        ...company,
        depositAmount: company.depositAmount !== null ? parseDecimalNumber(company.depositAmount) : null,
        depositDefaultChargeAmount:
          company.depositDefaultChargeAmount !== null ? parseDecimalNumber(company.depositDefaultChargeAmount) : null,
      },
    };
  }
}
