import { BadRequestException, Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { OldPayment, OldPaymentItem } from "src/modules/payments/entities";
import {
  OldECurrencies,
  OldECustomerType,
  OldEPaymentDirection,
  OldEPaymentFailedReason,
  OldEPaymentStatus,
} from "src/modules/payments/common/enums";
import { LokiLogger } from "src/common/logger";
import { NotificationService } from "src/modules/notifications/services";
import { EPaymentSystem } from "src/modules/payment-information/common/enums";
import { Company } from "src/modules/companies/entities";
import { StripeService } from "src/modules/stripe/services";
import { denormalizedAmountToNormalized, round2 } from "src/common/utils";
import Stripe from "stripe";
import { CompanyDepositCharge } from "src/modules/companies-deposit-charge/entities";
import { FIFTEEN_PERCENT_MULTIPLIER, GST_COEFFICIENT, TEN_PERCENT_MULTIPLIER } from "src/common/constants";
import { EmailsService } from "src/modules/emails/services";
import { CompanyIdOptionalDto } from "src/modules/companies/common/dto";
import { HelperService } from "src/modules/helper/services";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { OLD_UNFINISHED_DEPOSIT_CHARGE_STATUSES } from "src/modules/payments/common/constants/old-constants";
import { MINIMUM_DEPOSIT_CHARGE_AMOUNT } from "src/modules/companies-deposit-charge/common/constants";
import { EUserRoleName } from "src/modules/users/common/enums";
import { AccessControlService } from "src/modules/access-control/services";

@Injectable()
export class CompaniesDepositChargeService {
  private readonly lokiLogger = new LokiLogger(CompaniesDepositChargeService.name);

  public constructor(
    @InjectRepository(OldPayment)
    private readonly paymentRepository: Repository<OldPayment>,
    @InjectRepository(OldPaymentItem)
    private readonly paymentItemRepository: Repository<OldPaymentItem>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(CompanyDepositCharge)
    private readonly companyDepositChargeRepository: Repository<CompanyDepositCharge>,
    private readonly stripeService: StripeService,
    private readonly notificationService: NotificationService,
    private readonly emailsService: EmailsService,
    private readonly helperService: HelperService,
    private readonly accessControlService: AccessControlService,
  ) {}

  public async createChargeRequest(user: ITokenUserData, dto: CompanyIdOptionalDto): Promise<void> {
    const company = await this.accessControlService.getCompanyByRole(user, { abnCheck: true }, dto.companyId);

    if (!company) {
      throw new NotFoundException("Company not found");
    }

    if (!company.isActive) {
      throw new BadRequestException("No charges before Account activation available");
    }

    if (!company.depositDefaultChargeAmount) {
      throw new BadRequestException("Default deposit charge amount not filled");
    }

    const tenPercentFromDepositDefaultChargeAmount: number =
      company.depositDefaultChargeAmount * TEN_PERCENT_MULTIPLIER;

    if (company.depositAmount && company.depositAmount >= tenPercentFromDepositDefaultChargeAmount) {
      throw new BadRequestException("Deposit amount more than minimum limit (10%)");
    }

    await this.createOrUpdateDepositCharge(company, company.depositDefaultChargeAmount);
  }

  public async createOrUpdateDepositCharge(company: Company, depositDefaultChargeAmount: number): Promise<void> {
    const existedDepositCharge = await this.companyDepositChargeRepository.exists({
      where: { company: { id: company.id } },
    });

    let chargeAmount: number = depositDefaultChargeAmount;

    if (company.depositAmount && company.depositAmount > 0) {
      chargeAmount = depositDefaultChargeAmount - company.depositAmount;
    }

    if (chargeAmount <= 0) {
      return;
    }

    if (existedDepositCharge) {
      if (company.isActive) {
        throw new BadRequestException("Deposit charge request cannot be changed before execution!");
      } else {
        await this.companyDepositChargeRepository.update(
          { company: { id: company.id } },
          { depositChargeAmount: chargeAmount },
        );

        await this.updateCompanyDepositDefaultChargeAmountValue(company, depositDefaultChargeAmount);
      }
    } else {
      const companyDepositCharge = this.companyDepositChargeRepository.create({
        depositChargeAmount: chargeAmount,
        company: company,
      });

      await this.companyDepositChargeRepository.save(companyDepositCharge);

      await this.updateCompanyDepositDefaultChargeAmountValue(company, depositDefaultChargeAmount);
    }
  }

  public async chargeCompaniesDeposit(): Promise<void> {
    const depositCharges = await this.companyDepositChargeRepository.find({
      where: { company: { isActive: true } },
      relations: { company: { paymentInformation: true, superAdmin: { userRoles: { profile: true, role: true } } } },
    });

    for (const depositCharge of depositCharges) {
      this.chargeCompanyDeposit(depositCharge).catch((error: Error) => {
        this.lokiLogger.error(`Error in chargeCompanies: ${error.message}`);
      });
    }
  }

  public async chargeCompanyDeposit(
    depositCharge: CompanyDepositCharge,
    currency: OldECurrencies = OldECurrencies.AUD,
  ): Promise<void> {
    const company = depositCharge.company;

    const payments = await this.paymentRepository.find({
      where: {
        companyId: company.id,
        direction: OldEPaymentDirection.INCOMING,
        isDepositCharge: true,
        items: {
          status: In(OLD_UNFINISHED_DEPOSIT_CHARGE_STATUSES),
        },
      },
      relations: { items: true },
    });

    let isUnfinishedPaymentExist = false;

    for (const payment of payments) {
      if (payment.items && payment.items.length > 0) {
        const unfinishedItemsCount = payment.items.length;

        if (unfinishedItemsCount !== 0) {
          isUnfinishedPaymentExist = true;
        }
      }
    }

    if (isUnfinishedPaymentExist) {
      throw new BadRequestException("Unfinished deposit charge exist!");
    }

    if (!company.paymentInformation) {
      this.sendDepositChargeFailedNotification(company, OldEPaymentFailedReason.INFO_NOT_FILLED);
      throw new BadRequestException("Payment info not filled!");
    }

    if (
      !company.paymentInformation.stripeClientPaymentMethodId ||
      !company.paymentInformation.stripeClientAccountId ||
      !company.paymentInformation.stripeClientLastFour
    ) {
      this.sendDepositChargeFailedNotification(company, OldEPaymentFailedReason.INFO_NOT_FILLED);
      throw new BadRequestException("Stripe payment info not filled!");
    }

    if (!company.adminEmail) {
      this.sendDepositChargeFailedNotification(company, OldEPaymentFailedReason.INFO_NOT_FILLED);
      throw new BadRequestException("Company admin email not fill!");
    }

    if (!company.superAdmin) {
      this.sendDepositChargeFailedNotification(company, OldEPaymentFailedReason.INFO_NOT_FILLED);
      throw new BadRequestException("Company admin info not fill!");
    }

    const superAdminRole = company.superAdmin.userRoles.find(
      (userRole) =>
        userRole.role.name === EUserRoleName.CORPORATE_CLIENTS_SUPER_ADMIN ||
        userRole.role.name === EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_SUPER_ADMIN,
    );

    if (!superAdminRole) {
      this.sendDepositChargeFailedNotification(company, OldEPaymentFailedReason.INFO_NOT_FILLED);
      throw new BadRequestException("Super admin role not found!");
    }

    let depositDefaultChargeAmount = company.depositDefaultChargeAmount;

    if (!depositDefaultChargeAmount) {
      depositDefaultChargeAmount = depositCharge.depositChargeAmount;
    }

    const tenPercentFromDepositDefaultChargeAmount: number = depositDefaultChargeAmount * TEN_PERCENT_MULTIPLIER;
    const fifteenPercentFromDepositDefaultChargeAmount: number =
      depositDefaultChargeAmount * FIFTEEN_PERCENT_MULTIPLIER;

    if (company.depositAmount && company.depositAmount >= fifteenPercentFromDepositDefaultChargeAmount) {
      await this.companyDepositChargeRepository.delete({ id: depositCharge.id });

      return;
    }

    if (company.depositAmount && company.depositAmount >= tenPercentFromDepositDefaultChargeAmount) {
      await this.companyDepositChargeRepository.delete({ id: depositCharge.id });

      await this.emailsService.sendDepositLowBalanceNotification(company.contactEmail, {
        adminName: superAdminRole?.profile?.preferredName || superAdminRole?.profile?.firstName || "",
        platformId: company.platformId,
        currentBalance: company.depositAmount,
        minimumRequiredBalance: MINIMUM_DEPOSIT_CHARGE_AMOUNT,
      });

      return;
    }

    let paymentIntent;
    let paymentStatus: OldEPaymentStatus = OldEPaymentStatus.DEPOSIT_PAYMENT_REQUEST_INITIALIZING;
    let paymentNote: string | null | undefined = "Deposit charge";
    const fullAmount = depositCharge.depositChargeAmount;
    let amount = fullAmount;
    let gstAmount = 0;

    if (fullAmount > 0) {
      try {
        paymentIntent = await this.stripeService.chargeByBECSDebit(
          denormalizedAmountToNormalized(Number(fullAmount)),
          currency,
          company.paymentInformation.stripeClientPaymentMethodId,
          company.paymentInformation.stripeClientAccountId,
          company.platformId,
        );

        if (paymentIntent.next_action) {
          this.lokiLogger.warn(`STRIPE DEPOSIT CHARGE, REQUIRED NEXT ACTION, company id: ${company.id}`);
        } // TODO R check

        const isGstPayers = this.helperService.isCorporateGstPayer(company.country);

        if (isGstPayers.client) {
          amount = round2(fullAmount / GST_COEFFICIENT);
          gstAmount = round2(fullAmount - amount);
        }
      } catch (error) {
        paymentStatus = OldEPaymentStatus.AUTHORIZATION_FAILED;
        paymentNote = (error as Stripe.Response<Stripe.StripeRawError>).message ?? null;
      }
    }

    const newPayment = this.paymentRepository.create({
      direction: OldEPaymentDirection.INCOMING,
      customerType: OldECustomerType.CORPORATE,
      system: EPaymentSystem.STRIPE,
      totalAmount: amount,
      totalGstAmount: gstAmount,
      totalFullAmount: fullAmount,
      currency,
      company: company,
      note: paymentNote,
      paymentMethodInfo: `Bank Account ${company.paymentInformation.stripeClientLastFour}`,
      isDepositCharge: true,
    });

    const payment = await this.paymentRepository.save(newPayment);

    const paymentItem = this.paymentItemRepository.create({
      payment,
      externalId: paymentIntent?.id,
      amount,
      gstAmount,
      fullAmount: fullAmount,
      currency,
      status: paymentStatus,
      note: paymentNote,
    });

    await this.paymentItemRepository.save(paymentItem);

    if (paymentStatus === OldEPaymentStatus.AUTHORIZATION_FAILED) {
      await this.companyDepositChargeRepository.delete({ id: depositCharge.id });

      await this.emailsService.sendDepositChargeFailedNotification(company.contactEmail, {
        adminName: superAdminRole?.profile?.preferredName || superAdminRole?.profile?.firstName || "",
        amount: amount,
        currency: currency,
        platformId: company.platformId,
        receiptNumber: payment.platformId || "",
      });

      this.sendDepositChargeFailedNotification(company, OldEPaymentFailedReason.DEPOSIT_CHARGE_FAILED);

      throw new UnprocessableEntityException(paymentNote);
    }

    await this.companyDepositChargeRepository.delete({ id: depositCharge.id });
  }

  /*
   * Helpers
   */

  private sendDepositChargeFailedNotification(company: Company, reason: OldEPaymentFailedReason): void {
    if (!company.superAdminId) {
      throw new BadRequestException(`Company with id ${company.id} does not have superAdmin`);
    }

    this.notificationService
      .sendDepositChargeFailedNotification(company.superAdminId, company.platformId, reason, {
        companyId: company.id,
      })
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send deposit charge failed notification for userRoleId: ${company.superAdminId}`,
          error.stack,
        );
      });
  }

  private async updateCompanyDepositDefaultChargeAmountValue(
    company: Company,
    depositDefaultChargeAmount: number,
  ): Promise<void> {
    if (
      !company.depositDefaultChargeAmount ||
      (company.depositDefaultChargeAmount && company.depositDefaultChargeAmount !== depositDefaultChargeAmount)
    ) {
      await this.companyRepository.update({ id: company.id }, { depositDefaultChargeAmount });
    }
  }
}
