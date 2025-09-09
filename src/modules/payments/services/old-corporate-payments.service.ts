import { BadRequestException, Injectable, UnprocessableEntityException } from "@nestjs/common";
import { IDiscountRate } from "src/modules/discounts/common/interfaces";
import {
  OldECurrencies,
  OldECustomerType,
  OldEPaymentDirection,
  OldEPaymentFailedReason,
  OldEPaymentStatus,
  OldEStripeInterpreterPayoutType,
} from "src/modules/payments/common/enums";
import { OldPayment, OldPaymentItem } from "src/modules/payments/entities";
import { denormalizedAmountToNormalized, findOneOrFail, round2 } from "src/common/utils";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { EAppointmentStatus } from "src/modules/appointments/appointment/common/enums";
import { In, Repository } from "typeorm";
import { PdfBuilderService } from "src/modules/pdf/services";
import { EmailsService } from "src/modules/emails/services";
import { ConfigService } from "@nestjs/config";
import { NotificationService } from "src/modules/notifications/services";
import { Company } from "src/modules/companies/entities";
import { InjectRepository } from "@nestjs/typeorm";
import { LokiLogger } from "src/common/logger";
import { EPaymentSystem } from "src/modules/payment-information/common/enums";
import {
  FIFTEEN_PERCENT_MULTIPLIER,
  GST_COEFFICIENT,
  ONE_HUNDRED,
  TEN_PERCENT_MULTIPLIER,
  UNDEFINED_VALUE,
} from "src/common/constants";
import { CompaniesDepositChargeService } from "src/modules/companies-deposit-charge/services";
import { OldICreateTransfer } from "src/modules/payments/common/interfaces/old-create-transfer.interface";
import Stripe from "stripe";
import { IPayoutResponse } from "src/modules/paypal/common/interfaces";
import { PaypalSdkService } from "src/modules/paypal/services";
import { StripeService } from "src/modules/stripe/services";
import { PaymentInformation } from "src/modules/payment-information/entities";
import {
  OldICreateCorporatePayoutByStripe,
  OldICreateCorporateTransferResult,
} from "src/modules/payments/common/interfaces";
import { OldPaymentsHelperService } from "src/modules/payments/services/old-payments-helper.service";
import { ECompanyType } from "src/modules/companies/common/enums";
import { User } from "src/modules/users/entities";
import { format } from "date-fns";
import { MINIMUM_DEPOSIT_CHARGE_AMOUNT } from "src/modules/companies-deposit-charge/common/constants";
import { EUserRoleName } from "src/modules/users/common/enums";
import { HelperService } from "src/modules/helper/services";

@Injectable()
export class OldCorporatePaymentsService {
  private readonly lokiLogger = new LokiLogger(OldCorporatePaymentsService.name);
  private readonly BACK_END_URL: string;

  public constructor(
    @InjectRepository(OldPaymentItem)
    private readonly paymentItemRepository: Repository<OldPaymentItem>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(OldPayment)
    private readonly paymentRepository: Repository<OldPayment>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly emailsService: EmailsService,
    private readonly pdfBuilderService: PdfBuilderService,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
    private readonly companiesDepositChargeService: CompaniesDepositChargeService,
    private readonly stripeService: StripeService,
    private readonly paypalSdkService: PaypalSdkService,
    private readonly paymentsHelperService: OldPaymentsHelperService,
    private readonly helperService: HelperService,
  ) {
    this.BACK_END_URL = this.configService.getOrThrow<string>("appUrl");
  }

  /*
   * Corporate client, pay in, deposit
   */

  public async chargeFromDeposit(
    amount: number,
    gstAmount: number,
    appointmentId: string,
    discounts: IDiscountRate | null,
    discountByMembershipMinutes: number,
    discountByMembershipDiscount: number,
    discountByPromoCode: number,
    company: Company,
    currency: OldECurrencies = OldECurrencies.AUD,
  ): Promise<void> {
    let payment: OldPayment | null = await this.paymentRepository.findOne({
      where: { appointment: { id: appointmentId }, direction: OldEPaymentDirection.INCOMING },
      relations: { items: true },
    });

    const appointment = await findOneOrFail(appointmentId, this.appointmentRepository, {
      where: { id: appointmentId },
      relations: {
        client: {
          paymentInformation: true,
        },
        interpreter: true,
      },
    });

    if (!appointment.client) {
      await this.changeAppointmentStatusToCancelledBySystem(appointment.id);
      throw new BadRequestException("User role not exist!");
    }

    if (company.companyType === ECompanyType.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS) {
      company = await findOneOrFail(company.operatedByMainCompanyId, this.companyRepository, {
        where: { id: company.operatedByMainCompanyId },
      });
    }

    let paymentStatus: OldEPaymentStatus = OldEPaymentStatus.AUTHORIZED;
    let paymentNote: string | null | undefined = null;
    const fullAmount = amount + gstAmount;

    if (fullAmount > 0) {
      if (!company.depositAmount) {
        company.depositAmount = 0;
      }

      if (!company.depositDefaultChargeAmount) {
        company.depositDefaultChargeAmount = 0;
      }

      if (company.depositAmount < fullAmount) {
        paymentStatus = OldEPaymentStatus.AUTHORIZATION_FAILED;
        paymentNote = "Insufficient funds on deposit";
        // TODO R: ?
      } else {
        try {
          await this.chargeFromCompanyDeposit(company, fullAmount);
        } catch (error) {
          this.lokiLogger.error(`Error in chargeFromDeposit: ${(error as Error).message}, ${(error as Error).stack}`);
        }
      }
    }

    if (!payment) {
      const newPayment = this.paymentRepository.create({
        direction: OldEPaymentDirection.INCOMING,
        customerType: OldECustomerType.CORPORATE,
        fromClient: appointment.client,
        appointment,
        system: EPaymentSystem.DEPOSIT,
        totalAmount: amount,
        totalGstAmount: gstAmount,
        totalFullAmount: amount + gstAmount,
        currency,
        company,
        paymentMethodInfo: `Deposit of company ${company.platformId}`,
      });

      payment = await this.paymentRepository.save(newPayment);
    } else {
      if (payment.currency !== currency) {
        try {
          await this.changeAppointmentStatusToCancelledBySystem(appointment.id);

          this.sendAuthorizationPaymentFailedNotification(appointment, OldEPaymentFailedReason.INCORRECT_CURRENCY);
        } catch (error) {
          this.lokiLogger.error(`Error in chargeFromDeposit: ${(error as Error).message}, ${(error as Error).stack}`);
        }
        throw new BadRequestException(
          "New payment item currency must been the same like other payment items currencies",
        );
      }
    }

    const paymentItem = this.paymentItemRepository.create({
      payment,
      amount,
      gstAmount,
      fullAmount,
      currency,
      status: paymentStatus,
      note: paymentNote,
      appliedPromoDiscountsPercent: discounts ? discounts.promoCampaignDiscount : null,
      appliedMembershipDiscountsPercent: discounts ? discounts.membershipDiscount : null,
      appliedPromoDiscountsMinutes: discounts ? discounts.promoCampaignDiscountMinutes : null,
      appliedMembershipFreeMinutes: discounts ? discounts.membershipFreeMinutes : null,
      appliedPromoCode: discounts ? discounts.promoCode : null,
      appliedMembershipType: discounts ? discounts.membershipType : null,
      amountOfAppliedDiscountByMembershipMinutes: discountByMembershipMinutes,
      amountOfAppliedDiscountByMembershipDiscount: discountByMembershipDiscount,
      amountOfAppliedDiscountByPromoCode: discountByPromoCode,
    });

    const newPaymentItem = await this.paymentItemRepository.save(paymentItem);

    if (!payment.items) {
      payment.items = [];
    }

    payment.items.push(newPaymentItem);

    if (payment.items && payment.items.length > 0) {
      const authorizedItemsCount = payment.items.filter((item) => item.status === OldEPaymentStatus.AUTHORIZED).length;

      if (authorizedItemsCount > 0) {
        let totalAmount = 0;
        let totalGstAmount = 0;
        let totalFullAmount = 0;

        for (const item of payment.items) {
          if (item.status === OldEPaymentStatus.AUTHORIZED) {
            totalAmount += Number(item.amount);
            totalGstAmount += Number(item.gstAmount);
            totalFullAmount += Number(item.fullAmount);
          }
        }

        await this.paymentRepository.update(
          { id: payment.id },
          {
            totalAmount,
            totalGstAmount,
            totalFullAmount,
          },
        );
      }
    }

    if (paymentStatus === OldEPaymentStatus.AUTHORIZATION_FAILED) {
      try {
        await this.changeAppointmentStatusToCancelledBySystem(appointment.id);

        if (!company.superAdminId) {
          throw new BadRequestException(`Company ${company.id} does not have superAdminId`);
        }

        const superAdmin = await findOneOrFail(company.superAdminId, this.userRepository, {
          where: { id: company.superAdminId },
          relations: { userRoles: { profile: true, role: true } },
        });

        const superAdminRole = superAdmin.userRoles.find(
          (userRole) =>
            userRole.role.name === EUserRoleName.CORPORATE_CLIENTS_SUPER_ADMIN ||
            userRole.role.name === EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_SUPER_ADMIN,
        );

        if (!superAdminRole) {
          throw new BadRequestException("Super admin role not found!");
        }

        await this.emailsService.sendDepositBalanceInsufficientFundNotification(company.contactEmail, {
          adminName: superAdminRole?.profile?.preferredName || superAdminRole?.profile?.firstName || "",
          platformId: company.platformId,
          date: format(new Date(), "dd/MM/yyyy"),
        });

        this.sendAuthorizationPaymentFailedNotification(appointment, OldEPaymentFailedReason.AUTH_FAILED);
      } catch (error) {
        this.lokiLogger.error(`Error in chargeFromDeposit: ${(error as Error).message}, ${(error as Error).stack}`);
      }

      throw new UnprocessableEntityException(paymentNote);
    }

    this.sendAuthorizationPaymentSuccessNotification(appointment);
  }

  public async capturePayment(appointment: Appointment, isSecondAttempt: boolean = false): Promise<void> {
    const payment = await findOneOrFail(
      appointment.id,
      this.paymentRepository,
      {
        where: { appointment: { id: appointment.id }, direction: OldEPaymentDirection.INCOMING },
        relations: { items: true },
      },
      "appointment.id",
    );

    if (payment.system !== EPaymentSystem.DEPOSIT) {
      throw new BadRequestException("Incorrect payment system!");
    }

    if (payment.direction !== OldEPaymentDirection.INCOMING) {
      throw new BadRequestException("Incorrect payment direction!");
    }

    if (!appointment.client) {
      throw new BadRequestException("Client not exist!");
    }

    if (!appointment.client.profile) {
      this.sendAuthorizationPaymentFailedNotification(appointment, OldEPaymentFailedReason.PROFILE_NOT_FILLED);
      throw new BadRequestException("Client profile not fill!");
    }

    if (!appointment.client.profile.contactEmail) {
      this.sendAuthorizationPaymentFailedNotification(appointment, OldEPaymentFailedReason.PROFILE_NOT_FILLED);
      throw new BadRequestException("Client contact email not fill!");
    }

    const company = await findOneOrFail(appointment.client.operatedByCompanyId, this.companyRepository, {
      where: { id: appointment.client.operatedByCompanyId },
    });

    let isFirstItem = true;

    for (const paymentItem of payment.items) {
      if (
        paymentItem.status !== OldEPaymentStatus.AUTHORIZED &&
        isSecondAttempt &&
        paymentItem.status !== OldEPaymentStatus.CAPTURE_FAILED
      ) {
        await this.paymentItemRepository.update(
          { id: paymentItem.id },
          { note: "Incorrect payment status!", status: OldEPaymentStatus.CAPTURE_FAILED },
        );
        continue;
      }

      if (isFirstItem) {
        isFirstItem = false;
        await this.recalculateFinalPrice(appointment, paymentItem, company);
      }

      await this.paymentItemRepository.update({ id: paymentItem.id }, { status: OldEPaymentStatus.CAPTURED });
    }

    await this.appointmentRepository.update(
      { id: appointment.id },
      { paidByClient: payment.totalFullAmount, clientCurrency: payment.currency },
    );

    try {
      const receipt = await this.pdfBuilderService.generatePayInReceipt(payment.id);

      await this.paymentRepository.update(
        { id: payment.id },
        {
          receipt: receipt.receiptKey,
        },
      );

      const receiptLink = `${this.BACK_END_URL}/v1/payments/download-receipt?receiptKey=${receipt.receiptKey}`;

      await this.emailsService.sendIncomingPaymentReceipt(company.contactEmail, receiptLink, receipt.receiptData);
    } catch (error) {
      this.lokiLogger.error(
        `Error in corporate capturePayment: ${(error as Error).message}, ${(error as Error).stack}`,
      );
    }
  }

  public async processSameCompanyCommission(appointment: Appointment): Promise<void> {
    const payment = await findOneOrFail(
      appointment.id,
      this.paymentRepository,
      {
        where: { appointment: { id: appointment.id }, direction: OldEPaymentDirection.INCOMING },
        relations: {
          items: true,
          company: true,
        },
      },
      "appointment.id",
    );

    if (!payment.company) {
      throw new BadRequestException("Company payment information not found!");
    }

    const company = await findOneOrFail(payment.company.id, this.companyRepository, {
      where: { id: payment.company.id },
    });

    const commissionRatePercent = company.platformCommissionRate;

    if (!commissionRatePercent) {
      throw new BadRequestException("Commission rate are not set!");
    }

    const commissionRate = commissionRatePercent / ONE_HUNDRED;

    const originalAmount = payment.totalFullAmount;
    const commissionAmount = round2(originalAmount * commissionRate);
    const refundAmount = round2(originalAmount - commissionAmount);

    try {
      const refundPaymentItem = this.paymentItemRepository.create({
        payment: { id: payment.id },
        amount: -refundAmount,
        fullAmount: -refundAmount,
        gstAmount: 0,
        currency: payment.currency,
        status: OldEPaymentStatus.REFUND,
        note: `Same company commission refund. Commission retained: ${commissionAmount}`,
      });

      await this.paymentItemRepository.save(refundPaymentItem);

      const isGstPayers = this.helperService.isCorporateGstPayer(null, company.country);
      let commissionAmountWithoutGst = commissionAmount;
      let commissionGstAmount = 0;

      if (isGstPayers.client) {
        commissionAmountWithoutGst = round2(commissionAmount / GST_COEFFICIENT);
        commissionGstAmount = round2(commissionAmount - commissionAmountWithoutGst);
      }

      const commissionPaymentItem = this.paymentItemRepository.create({
        payment: { id: payment.id },
        amount: commissionAmountWithoutGst,
        fullAmount: commissionAmount,
        gstAmount: commissionGstAmount,
        currency: payment.currency,
        status: OldEPaymentStatus.CAPTURED,
        note: `Same company commission captured: ${commissionAmount}`,
      });

      await this.paymentItemRepository.save(commissionPaymentItem);

      const commissionPaymentItems = payment.items.filter((item) => item.status === OldEPaymentStatus.AUTHORIZED);

      if (commissionPaymentItems.length > 0) {
        const commissionPaymentItemIds = commissionPaymentItems.map((item) => item.id);
        await this.paymentItemRepository.update(commissionPaymentItemIds, {
          status: OldEPaymentStatus.SUCCESS,
        });
      }

      await this.paymentRepository.update(
        { id: payment.id },
        {
          totalAmount: commissionAmountWithoutGst,
          totalGstAmount: commissionGstAmount,
          totalFullAmount: commissionAmount,
          note: `Same company processing - ${((refundAmount / originalAmount) * ONE_HUNDRED).toFixed(1)}% refunded, ${((commissionAmount / originalAmount) * ONE_HUNDRED).toFixed(1)}% commission retained`,
        },
      );

      const currentDepositAmount = Number(company.depositAmount) || 0;
      const newDepositAmount = round2(currentDepositAmount + refundAmount);

      await this.companyRepository.update({ id: payment.company.id }, { depositAmount: newDepositAmount });

      await this.appointmentRepository.update(
        { id: appointment.id },
        { paidByClient: commissionAmount, clientCurrency: payment.currency },
      );

      const receipt = await this.pdfBuilderService.generatePayInReceipt(payment.id);

      await this.paymentRepository.update({ id: payment.id }, { receipt: receipt.receiptKey });

      const receiptLink = `${this.BACK_END_URL}/v1/payments/download-receipt?receiptKey=${receipt.receiptKey}`;

      await this.emailsService.sendIncomingPaymentReceipt(company.contactEmail, receiptLink, receipt.receiptData);
    } catch (error) {
      this.lokiLogger.error(
        `Failed to process same company commission for appointment ${appointment.id}: ${(error as Error).message},`,
        (error as Error).stack,
      );
    }
  }

  public async cancelAuthorization(appointmentId: string, company: Company): Promise<void> {
    const payment = await findOneOrFail(
      appointmentId,
      this.paymentRepository,
      {
        where: { appointment: { id: appointmentId }, direction: OldEPaymentDirection.INCOMING },
        relations: { items: true },
      },
      "appointment.id",
    );

    if (payment.system !== EPaymentSystem.DEPOSIT) {
      throw new BadRequestException("Incorrect payment system!");
    }

    if (payment.direction !== OldEPaymentDirection.INCOMING) {
      throw new BadRequestException("Incorrect payment direction!");
    }

    for (const paymentItem of payment.items) {
      if (paymentItem.status === OldEPaymentStatus.CANCELED) {
        continue;
      }

      if (paymentItem.status !== OldEPaymentStatus.AUTHORIZED) {
        await this.paymentItemRepository.update(
          { id: paymentItem.id },
          {
            note: `Incorrect payment status! Previous status: ${paymentItem.status}`,
            status: OldEPaymentStatus.CANCEL_FAILED,
          },
        );
        continue;
      }

      if (!company.depositAmount) {
        company.depositAmount = 0;
      }

      if (paymentItem.fullAmount > 0) {
        await this.companyRepository.update(
          { id: company.id },
          { depositAmount: Number(company.depositAmount) + Number(paymentItem.fullAmount) },
        );
      }

      await this.paymentItemRepository.update({ id: paymentItem.id }, { status: OldEPaymentStatus.CANCELED });
    }
  }

  private async recalculateFinalPrice(
    appointment: Appointment,
    paymentItem: OldPaymentItem,
    company: Company,
  ): Promise<void> {
    let finalPrice: number | null = null;

    if (!appointment.client) {
      throw new BadRequestException("Client not exist!");
    }

    const isCorporate: boolean = true;
    const country = company.country;

    if (!country) {
      throw new BadRequestException("Country not filled!");
    }

    let date: Date;

    if (appointment.businessStartTime) {
      date = new Date(appointment.businessStartTime);
    } else {
      date = new Date(appointment.scheduledStartTime);
    }

    const recalculatedPrice = await this.paymentsHelperService.calculateAppointmentPrice(
      appointment,
      date,
      isCorporate,
      country,
    );

    const { discounts, discountByMembershipMinutes, discountByMembershipDiscount, discountByPromoCode } =
      recalculatedPrice;

    const updateItemPayload: Partial<OldPaymentItem> = {
      appliedPromoDiscountsPercent: discounts?.promoCampaignDiscount || null,
      appliedMembershipDiscountsPercent: discounts?.membershipDiscount || null,
      appliedPromoDiscountsMinutes: discounts?.promoCampaignDiscountMinutes || null,
      appliedMembershipFreeMinutes: discounts?.membershipFreeMinutes || null,
      appliedPromoCode: discounts?.promoCode || null,
      appliedMembershipType: discounts?.membershipType || null,
      amountOfAppliedDiscountByMembershipMinutes: discountByMembershipMinutes,
      amountOfAppliedDiscountByMembershipDiscount: discountByMembershipDiscount,
      amountOfAppliedDiscountByPromoCode: discountByPromoCode,
    };

    const priceChanged =
      paymentItem.amount !== recalculatedPrice.amount || paymentItem.gstAmount !== recalculatedPrice.gstAmount;

    if (priceChanged) {
      finalPrice = round2(Number(recalculatedPrice.amount) + Number(recalculatedPrice.gstAmount));

      updateItemPayload.amount = recalculatedPrice.amount;
      updateItemPayload.gstAmount = recalculatedPrice.gstAmount;
      updateItemPayload.fullAmount = finalPrice;
    }

    await this.paymentItemRepository.update({ id: paymentItem.id }, updateItemPayload);

    if (priceChanged) {
      const updatedItems = await this.paymentItemRepository.find({
        where: { paymentId: paymentItem.paymentId, status: OldEPaymentStatus.AUTHORIZED },
        select: { id: true, amount: true, gstAmount: true, fullAmount: true },
      });

      let recalculatedTotalAmount = 0;
      let recalculatedTotalGstAmount = 0;
      let recalculatedTotalFullAmount = 0;

      for (const item of updatedItems) {
        recalculatedTotalAmount = Number(recalculatedTotalAmount) + Number(item.amount);
        recalculatedTotalGstAmount = Number(recalculatedTotalGstAmount) + Number(item.gstAmount);
        recalculatedTotalFullAmount = Number(recalculatedTotalFullAmount) + Number(item.fullAmount);
      }

      await this.paymentRepository.update(
        { id: paymentItem.paymentId },
        {
          totalAmount: recalculatedTotalAmount,
          totalGstAmount: recalculatedTotalGstAmount,
          totalFullAmount: recalculatedTotalFullAmount,
        },
      );

      if (company.depositAmount) {
        const depositAmount = Number(company.depositAmount) + Number(paymentItem.fullAmount) - Number(finalPrice);
        await this.companyRepository.update({ id: company.id }, { depositAmount: round2(depositAmount) });
      }
    }
  }

  /*
   * Corporate interpreter, pay out
   */

  public async makeRecordToPayoutWaitingList(
    appointment: Appointment,
    company: Company,
    fullAmount: number,
    amount: number,
    gstAmount: number,
    currency: OldECurrencies = OldECurrencies.AUD,
  ): Promise<void> {
    const incomingPayment = await findOneOrFail(
      appointment.id,
      this.paymentRepository,
      {
        where: { appointment: { id: appointment.id }, direction: OldEPaymentDirection.INCOMING },
        relations: { items: true },
      },
      "appointment.id",
    );

    if (incomingPayment.items.length <= 0) {
      throw new BadRequestException("Incoming Payment not have items");
    }

    for (const paymentItem of incomingPayment.items) {
      if (paymentItem.status !== OldEPaymentStatus.CAPTURED) {
        throw new BadRequestException(`One of Incoming Payment items have incorrect status (${paymentItem.status})`);
      }
    }

    if (!appointment.interpreter) {
      this.lokiLogger.error(
        `Appointment with id ${appointment.id} does not have interpreter (${appointment.interpreterId})`,
      );

      return;
    }

    if (!company.paymentInformation) {
      this.lokiLogger.error(`Company with id ${company.id} does not have payment info`);

      return;
    }

    const paymentInfo = company.paymentInformation;

    let paymentSystem: EPaymentSystem | null = null;

    if (paymentInfo.interpreterSystemForPayout === EPaymentSystem.STRIPE) {
      paymentSystem = EPaymentSystem.STRIPE;
    } else {
      paymentSystem = EPaymentSystem.PAYPAL;
    }

    const newPayment = this.paymentRepository.create({
      direction: OldEPaymentDirection.OUTCOMING,
      customerType: OldECustomerType.CORPORATE,
      toInterpreter: appointment.interpreter,
      appointment,
      system: paymentSystem,
      totalAmount: amount,
      totalGstAmount: gstAmount,
      totalFullAmount: fullAmount,
      currency,
      company,
    });

    const payment = await this.paymentRepository.save(newPayment);

    const paymentItem = this.paymentItemRepository.create({
      payment,
      amount,
      gstAmount,
      fullAmount: amount + gstAmount,
      currency,
      status: OldEPaymentStatus.WAITING_FOR_PAYOUT,
      note: "Waiting for Payout",
    });

    await this.paymentItemRepository.save(paymentItem);

    return;
  }

  public async makeCorporatePayouts(): Promise<void> {
    const payments = await this.paymentRepository.find({
      where: {
        customerType: OldECustomerType.CORPORATE,
        items: {
          status: OldEPaymentStatus.WAITING_FOR_PAYOUT,
        },
      },
      relations: {
        company: { paymentInformation: true, address: true, superAdmin: { userRoles: { profile: true } } },
        appointment: { interpreter: { profile: true, user: true, address: true, abnCheck: true } },
      },
    });

    const groupedPayments: { [companyId: string]: OldPayment[] } = payments.reduce<{
      [companyId: string]: OldPayment[];
    }>((acc, payment) => {
      const companyId = payment.companyId;

      if (companyId) {
        if (!acc[companyId]) {
          acc[companyId] = [];
        }

        acc[companyId].push(payment);
      }

      return acc;
    }, {});

    const paymentsGroupedByCompanies = Object.values(groupedPayments);

    for (const paymentsGroupedByCompany of paymentsGroupedByCompanies) {
      let totalFullAmount = 0;
      let totalGstAmount = 0;
      const paymentIds: string[] = [];
      let company: Company | null = paymentsGroupedByCompany[0].company;

      for (const payment of paymentsGroupedByCompany) {
        totalFullAmount += Number(payment.totalFullAmount);
        totalGstAmount += Number(payment.totalGstAmount);
        paymentIds.push(payment.id);

        if (!company) {
          company = payment.company;
        }
      }

      totalFullAmount = round2(totalFullAmount);
      totalGstAmount = round2(totalGstAmount);

      try {
        await this.makeTransferAndPayout(totalFullAmount, paymentIds, company);
      } catch (error) {
        this.lokiLogger.error(`makeTransferAndPayout: ${(error as Error).message}, ${(error as Error).stack}`);

        await this.paymentRepository.update({ id: In(paymentIds) }, { note: (error as Error).message });
        continue;
      }

      for (const payment of paymentsGroupedByCompany) {
        if (payment.appointment) {
          await this.appointmentRepository.update(
            { id: payment.appointment.id },
            {
              receivedByInterpreter: payment.totalFullAmount,
              receivedByInterpreterGst: payment.totalGstAmount,
              interpreterCurrency: payment.currency,
            },
          );
        }
      }

      try {
        const receipt = await this.pdfBuilderService.generateCorporatePayOutReceipt(paymentsGroupedByCompany, company);

        await this.paymentRepository.update(
          { id: In(paymentIds) },
          {
            receipt: receipt.receiptKey,
          },
        );

        const receiptLink = `${this.BACK_END_URL}/v1/payments/download-receipt?receiptKey=${receipt.receiptKey}`;

        await this.emailsService.sendOutgoingCorporatePaymentReceipt(
          company!.contactEmail,
          receiptLink,
          receipt.receiptData,
        );

        const taxInvoice = await this.pdfBuilderService.generateCorporateTaxInvoiceReceipt(
          paymentsGroupedByCompany,
          company,
        );

        await this.paymentRepository.update(
          { id: In(paymentIds) },
          {
            taxInvoice: taxInvoice.receiptKey,
          },
        );

        const taxInvoiceLink = `${this.BACK_END_URL}/v1/payments/download-receipt?receiptKey=${taxInvoice.receiptKey}`;

        await this.emailsService.sendTaxInvoiceCorporatePaymentReceipt(
          company!.contactEmail,
          taxInvoiceLink,
          taxInvoice.receiptData,
        );
      } catch (error) {
        this.lokiLogger.error(`Error in makeCorporatePayouts: ${(error as Error).message}, ${(error as Error).stack}`);
      }
    }
  }

  public async makeTransferAndPayout(
    fullAmount: number,
    paymentIds: string[],
    company: Company | null,
    currency: OldECurrencies = OldECurrencies.AUD,
  ): Promise<void> {
    if (!company) {
      throw new BadRequestException("Company not exist!");
    }

    if (!company.paymentInformation || !company.paymentInformation.interpreterSystemForPayout) {
      throw new BadRequestException("Payment info not filled!");
    }

    const transferResultInfo = await this.createTransfer(
      fullAmount,
      company.platformId,
      company.paymentInformation,
      currency,
    );

    await this.paymentRepository.update(
      { id: In(paymentIds) },
      {
        system: company.paymentInformation.interpreterSystemForPayout,
        stripeInterpreterPayoutType:
          company.paymentInformation.interpreterSystemForPayout === EPaymentSystem.STRIPE
            ? OldEStripeInterpreterPayoutType.INTERNAL
            : UNDEFINED_VALUE,
        paymentMethodInfo: transferResultInfo.paymentMethodInfo,
        note: transferResultInfo.transferResult.paymentNote,
      },
    );
    await this.paymentItemRepository.update(
      { paymentId: In(paymentIds) },
      {
        transferId: transferResultInfo.transferResult.transferId,
        status: transferResultInfo.transferResult.paymentStatus,
        note: transferResultInfo.transferResult.paymentNote,
      },
    );

    if (transferResultInfo.transferResult.paymentStatus !== OldEPaymentStatus.TRANSFERED) {
      throw new UnprocessableEntityException(transferResultInfo.transferResult.paymentStatus);
    }

    if (
      company.paymentInformation.interpreterSystemForPayout === EPaymentSystem.STRIPE &&
      company.paymentInformation.stripeInterpreterCardId &&
      company.paymentInformation.stripeInterpreterCardLast4
    ) {
      const payoutResult = await this.createPayoutByStripe(
        company.paymentInformation,
        transferResultInfo.transferResult.paymentStatus,
        paymentIds,
        fullAmount,
        currency,
      );

      await this.paymentItemRepository.update(
        { paymentId: In(paymentIds) },
        {
          externalId: payoutResult.externalId,
          status: payoutResult.paymentStatus,
          note: payoutResult.paymentNote,
        },
      );
    }
  }

  private async createTransfer(
    fullAmount: number,
    companyPlatformId: string,
    companyPaymentInfo: PaymentInformation,
    currency: OldECurrencies = OldECurrencies.AUD,
  ): Promise<OldICreateCorporateTransferResult> {
    if (!companyPaymentInfo.interpreterSystemForPayout) {
      throw new BadRequestException("Payment info not filled!");
    }

    let transferResult: OldICreateTransfer | null = null;

    let paymentMethodInfo: string = "";

    if (companyPaymentInfo.interpreterSystemForPayout === EPaymentSystem.STRIPE) {
      transferResult = await this.createTransferByStripe(
        denormalizedAmountToNormalized(fullAmount),
        currency,
        companyPaymentInfo.stripeInterpreterAccountId,
      );

      if (companyPaymentInfo.stripeInterpreterCardId && companyPaymentInfo.stripeInterpreterCardLast4) {
        paymentMethodInfo = `Credit Card ${companyPaymentInfo.stripeInterpreterCardLast4}`;
      } else {
        paymentMethodInfo = `Bank Account ${companyPaymentInfo.stripeInterpreterBankAccountLast4}`;
      }
    } else {
      transferResult = await this.createTransferByPaypal(
        fullAmount,
        currency,
        companyPaymentInfo.paypalPayerId,
        companyPlatformId,
      );

      paymentMethodInfo = `Paypal Account ${companyPaymentInfo.paypalEmail}`;
    }

    return {
      transferResult,
      paymentMethodInfo,
    };
  }

  /*
   * Corporate interpreter, pay out, stripe
   */

  private async createTransferByStripe(
    fullAmount: number,
    currency: OldECurrencies,
    stripeInterpreterAccountId: string | null,
  ): Promise<OldICreateTransfer> {
    if (!stripeInterpreterAccountId) {
      throw new BadRequestException("Stripe payment info not filled!");
    }

    let transfer: Stripe.Response<Stripe.Transfer> | null = null;
    let paymentStatus: OldEPaymentStatus = OldEPaymentStatus.TRANSFERED;
    let paymentNote: string | null | undefined = null;

    try {
      transfer = await this.stripeService.createTransfer(fullAmount, currency, stripeInterpreterAccountId);
    } catch (error) {
      paymentStatus = OldEPaymentStatus.TRANSFER_FAILED;
      paymentNote = (error as Stripe.Response<Stripe.StripeRawError>).message ?? null;
    }

    return {
      transferId: transfer?.id,
      paymentStatus,
      paymentNote,
    };
  }

  private async createPayoutByStripe(
    companyPaymentInfo: PaymentInformation,
    paymentStatus: OldEPaymentStatus,
    paymentIds: string[],
    totalAmount: number,
    currency: OldECurrencies,
  ): Promise<OldICreateCorporatePayoutByStripe> {
    if (
      !companyPaymentInfo.stripeInterpreterAccountId ||
      !companyPaymentInfo.stripeInterpreterCardId ||
      !companyPaymentInfo.stripeInterpreterCardBrand ||
      !companyPaymentInfo.stripeInterpreterCardLast4
    ) {
      throw new BadRequestException("Stripe card payment info not filled!");
    }

    if (paymentStatus !== OldEPaymentStatus.TRANSFERED) {
      await this.paymentItemRepository.update(
        { paymentId: In(paymentIds) },
        {
          note: `Incorrect payment status! Previous status: ${paymentStatus}`,
          status: OldEPaymentStatus.PAYOUT_FAILED,
        },
      );
    }

    let externalId: string | null = null;
    let paymentNote: string | null = null;

    try {
      const payout = await this.stripeService.createPayout(
        totalAmount,
        currency,
        companyPaymentInfo.stripeInterpreterAccountId,
      );

      paymentStatus = OldEPaymentStatus.PAYOUT_SUCCESS;
      externalId = payout.id;

      // TODO R: check stripe payout receipt, if exist -- save
    } catch (error) {
      paymentStatus = OldEPaymentStatus.PAYOUT_FAILED;
      paymentNote = (error as Stripe.Response<Stripe.StripeRawError>).message ?? null;
    }

    return { externalId, paymentStatus, paymentNote };
  }

  /*
   * Corporate interpreter, pay out, paypal
   */

  private async createTransferByPaypal(
    fullAmount: number,
    currency: OldECurrencies,
    paypalPayerId: string | null,
    companyPlatformId: string,
  ): Promise<OldICreateTransfer> {
    if (!paypalPayerId) {
      throw new BadRequestException("Stripe payment info not filled!");
    }

    let transfer: IPayoutResponse | null = null;
    let paymentStatus: OldEPaymentStatus = OldEPaymentStatus.TRANSFERED;
    let paymentNote: string | null | undefined = null;

    try {
      transfer = await this.paypalSdkService.makeTransfer(
        paypalPayerId,
        String(fullAmount),
        companyPlatformId,
        currency,
      );
    } catch (error) {
      paymentStatus = OldEPaymentStatus.TRANSFER_FAILED;
      paymentNote = (error as Error).message ?? null;
    }

    return {
      transferId: transfer?.batch_header?.payout_batch_id,
      paymentStatus,
      paymentNote,
    };
  }

  /*
   * Helpers
   */
  // TODO: Add Status checking for appointment in live, no update.
  private async changeAppointmentStatusToCancelledBySystem(appointmentId: string): Promise<void> {
    await this.appointmentRepository.update({ id: appointmentId }, { status: EAppointmentStatus.CANCELLED_BY_SYSTEM });
  }

  private sendAuthorizationPaymentFailedNotification(appointment: Appointment, reason: OldEPaymentFailedReason): void {
    this.notificationService
      .sendAppointmentAuthorizationPaymentFailedNotification(appointment.client!.id, appointment.platformId, reason, {
        appointmentId: appointment.id,
      })
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send payment failed notification for userRoleId: ${appointment?.client?.id}`,
          error.stack,
        );
      });
  }

  private sendAuthorizationPaymentSuccessNotification(appointment: Appointment): void {
    this.notificationService
      .sendAppointmentAuthorizationPaymentSucceededNotification(appointment.client!.id, appointment.platformId, {
        appointmentId: appointment.id,
      })
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send payment success notification for userRoleId: ${appointment?.client?.id}`,
          error.stack,
        );
      });
  }

  private async chargeFromCompanyDeposit(company: Company, appointmentAmount: number): Promise<void> {
    const companyNewDepositAmount: number = company.depositAmount! - appointmentAmount;

    await this.companyRepository.update({ id: company.id }, { depositAmount: round2(companyNewDepositAmount) });

    if (!company.depositDefaultChargeAmount || company.depositDefaultChargeAmount <= 0) {
      return;
    }

    const tenPercentFromDepositDefaultChargeAmount: number =
      company.depositDefaultChargeAmount * TEN_PERCENT_MULTIPLIER;

    if (companyNewDepositAmount <= tenPercentFromDepositDefaultChargeAmount) {
      await this.companiesDepositChargeService.createOrUpdateDepositCharge(company, company.depositDefaultChargeAmount);

      return;
    }

    const fifteenPercentFromDepositDefaultChargeAmount: number =
      company.depositDefaultChargeAmount * FIFTEEN_PERCENT_MULTIPLIER;

    if (companyNewDepositAmount <= fifteenPercentFromDepositDefaultChargeAmount) {
      if (!company.superAdminId) {
        throw new BadRequestException(`Company ${company.id} does not have superAdminId`);
      }

      const superAdmin = await findOneOrFail(company.superAdminId, this.userRepository, {
        where: { id: company.superAdminId },
        relations: { userRoles: { profile: true, role: true } },
      });

      const superAdminRole = superAdmin.userRoles.find(
        (userRole) =>
          userRole.role.name === EUserRoleName.CORPORATE_CLIENTS_SUPER_ADMIN ||
          userRole.role.name === EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_SUPER_ADMIN,
      );

      if (!superAdminRole) {
        throw new BadRequestException("Super admin role not found!");
      }

      await this.emailsService.sendDepositLowBalanceNotification(company.contactEmail, {
        adminName: superAdminRole?.profile?.preferredName || superAdminRole?.profile?.firstName || "",
        platformId: company.platformId,
        currentBalance: company.depositAmount,
        minimumRequiredBalance: MINIMUM_DEPOSIT_CHARGE_AMOUNT,
      });

      return;
    }

    return;
  }
}
