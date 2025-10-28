import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, EntityManager, In, Repository } from "typeorm";
import { denormalizedAmountToNormalized, findManyTyped, round2 } from "src/common/utils";
import { FIFTEEN_PERCENT_MULTIPLIER, GST_COEFFICIENT, TEN_PERCENT_MULTIPLIER } from "src/common/constants";
import { HelperService } from "src/modules/helper/services";
import {
  EPaymentCurrency,
  EPaymentCustomerType,
  EPaymentDirection,
  EPaymentFailedReason,
  EPaymentStatus,
  EPaymentSystem,
} from "src/modules/payments-new/common/enums";
import { ICreatePaymentRecordResult } from "src/modules/payments-new/common/interfaces";
import { Payment } from "src/modules/payments-new/entities";
import { PaymentsCreationService } from "src/modules/payments-new/services";
import { StripePaymentsService } from "src/modules/stripe/services";
import { EUserRoleName } from "src/modules/users/common/enums";
import { UNFINISHED_DEPOSIT_CHARGE_STATUSES } from "src/modules/companies-deposit-charge/common/constants";
import { ECompaniesDepositChargeErrorCodes } from "src/modules/companies-deposit-charge/common/enums";
import {
  IAttemptStripeDepositChargeData,
  ICalculateDepositChargeGstAmounts,
  ICreateDepositChargePaymentRecordData,
  IHandleDepositChargeFailureData,
  IHandleDepositThresholdsData,
} from "src/modules/companies-deposit-charge/common/interfaces";
import {
  ChargeCompaniesDepositQuery,
  TChargeCompaniesDeposit,
  TChargeCompaniesDepositValidatedCompany,
} from "src/modules/companies-deposit-charge/common/types";
import { CompanyDepositCharge } from "src/modules/companies-deposit-charge/entities";
import { CompaniesDepositChargeNotificationService } from "src/modules/companies-deposit-charge/services";
import { IStripeOperationResult } from "src/modules/stripe/common/interfaces";

@Injectable()
export class CompaniesDepositChargeExecutionService {
  constructor(
    @InjectRepository(CompanyDepositCharge)
    private readonly companyDepositChargeRepository: Repository<CompanyDepositCharge>,
    private readonly companiesDepositChargeNotificationService: CompaniesDepositChargeNotificationService,
    private readonly paymentsCreationService: PaymentsCreationService,
    private readonly stripePaymentsService: StripePaymentsService,
    private readonly helperService: HelperService,
    private readonly dataSource: DataSource,
  ) {}

  public async executePendingDepositCharges(): Promise<void> {
    const depositCharges = await findManyTyped<TChargeCompaniesDeposit[]>(this.companyDepositChargeRepository, {
      select: ChargeCompaniesDepositQuery.select,
      where: { company: { isActive: true } },
      relations: ChargeCompaniesDepositQuery.relations,
    });
    const currency = this.determineCurrency();

    for (const depositCharge of depositCharges) {
      await this.dataSource.transaction(async (manager) => {
        await this.chargeCompanyDeposit(manager, depositCharge, currency);
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

    if (!(await this.handleDepositThresholds({ manager, depositCharge, company: validatedCompany, superAdminRole }))) {
      return;
    }

    const calculatedAmounts = this.calculateDepositChargeGstAmounts(
      depositCharge.depositChargeAmount,
      validatedCompany,
    );

    const stripeDepositChargeResult = await this.attemptStripeDepositCharge({
      depositCharge,
      company: validatedCompany,
      currency,
      totalFullAmount: calculatedAmounts.totalFullAmount,
    });

    const { payment } = await this.createDepositChargePaymentRecord({
      manager,
      stripeOperationResult: stripeDepositChargeResult,
      calculatedAmounts,
      company: validatedCompany,
      currency,
    });

    if (stripeDepositChargeResult.status === EPaymentStatus.AUTHORIZATION_FAILED) {
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

  private async handleDepositThresholds(data: IHandleDepositThresholdsData): Promise<boolean> {
    const { manager, depositCharge, company, superAdminRole } = data;

    const companyDepositChargeRepository = manager.getRepository(CompanyDepositCharge);

    const depositDefaultChargeAmount = company.depositDefaultChargeAmount ?? depositCharge.depositChargeAmount;
    const tenPercentThreshold = depositDefaultChargeAmount * TEN_PERCENT_MULTIPLIER;
    const fifteenPercentThreshold = depositDefaultChargeAmount * FIFTEEN_PERCENT_MULTIPLIER;

    if (company.depositAmount && company.depositAmount >= fifteenPercentThreshold) {
      await companyDepositChargeRepository.delete({ id: depositCharge.id });

      return false;
    }

    if (company.depositAmount && company.depositAmount >= tenPercentThreshold) {
      await companyDepositChargeRepository.delete({ id: depositCharge.id });
      await this.companiesDepositChargeNotificationService.sendDepositLowBalanceNotification(company, superAdminRole);

      return false;
    }

    return true;
  }

  private calculateDepositChargeGstAmounts(
    totalFullAmount: number,
    company: TChargeCompaniesDepositValidatedCompany,
  ): ICalculateDepositChargeGstAmounts {
    let amount = totalFullAmount;
    let totalGstAmount = 0;

    const isGstPayer = this.helperService.isCorporateGstPayer(company.country);

    if (isGstPayer.client && totalFullAmount > 0) {
      amount = round2(totalFullAmount / GST_COEFFICIENT);
      totalGstAmount = round2(totalFullAmount - amount);
    }

    return { totalAmount: amount, totalGstAmount, totalFullAmount };
  }

  private async createDepositChargePaymentRecord(
    data: ICreateDepositChargePaymentRecordData,
  ): Promise<ICreatePaymentRecordResult> {
    const { manager, stripeOperationResult, calculatedAmounts, company, currency } = data;

    const determinedPaymentMethodInfo = `Bank Account ${company.paymentInformation.stripeClientLastFour}`;

    return await this.paymentsCreationService.createPaymentRecord(manager, {
      direction: EPaymentDirection.INCOMING,
      customerType: EPaymentCustomerType.CORPORATE,
      system: EPaymentSystem.STRIPE,
      status: stripeOperationResult.status,
      isDepositCharge: true,
      paymentMethodInfo: determinedPaymentMethodInfo,
      externalId: stripeOperationResult.paymentIntentId,
      note: stripeOperationResult.error ?? "Deposit charge",
      company,
      currency,
      prices: {
        clientAmount: calculatedAmounts.totalAmount,
        clientGstAmount: calculatedAmounts.totalGstAmount,
        clientFullAmount: calculatedAmounts.totalFullAmount,
        interpreterAmount: 0,
        interpreterGstAmount: 0,
        interpreterFullAmount: 0,
      },
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

  private async attemptStripeDepositCharge(data: IAttemptStripeDepositChargeData): Promise<IStripeOperationResult> {
    const { depositCharge, company, currency, totalFullAmount } = data;

    const idempotencyKey = this.generateDepositChargeIdempotencyKey(depositCharge);
    try {
      const normalizedAmount = denormalizedAmountToNormalized(Number(totalFullAmount));
      const { paymentIntentId } = await this.stripePaymentsService.chargeByBECSDebit({
        amount: normalizedAmount,
        paymentMethodId: company.paymentInformation.stripeClientPaymentMethodId,
        customerId: company.paymentInformation.stripeClientAccountId,
        companyPlatformId: company.platformId,
        idempotencyKey,
        currency,
      });

      return {
        status: EPaymentStatus.DEPOSIT_PAYMENT_REQUEST_INITIALIZING,
        paymentIntentId,
      };
    } catch (error) {
      return {
        status: EPaymentStatus.AUTHORIZATION_FAILED,
        error: (error as Error).message,
      };
    }
  }

  private generateDepositChargeIdempotencyKey(depositCharge: TChargeCompaniesDeposit): string {
    return `deposit-charge-${depositCharge.company.platformId}-${depositCharge.id}`;
  }

  private determineCurrency(): EPaymentCurrency {
    return EPaymentCurrency.AUD;
  }
}
