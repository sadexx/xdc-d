import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { OldPayment } from "src/modules/payments/entities";
import { Repository } from "typeorm";
import { UserRole } from "src/modules/users/entities";
import { Company } from "src/modules/companies/entities";
import { findOneOrFail, getDifferenceInHHMMSS, isInRoles, round2 } from "src/common/utils";
import {
  IDepositChargeReceipt,
  IDepositChargeReceiptWithKey,
  IInterpreterBadge,
  IInterpreterBadgeWithKey,
  IMembershipInvoice,
  IMembershipInvoiceWithKey,
  IPayInDiscounts,
  IPayInReceipt,
  IPayInReceiptWithKey,
  IPayOutReceipt,
  IPayOutReceiptWithKey,
  ITaxInvoiceCorporateReceipt,
  ITaxInvoiceCorporateReceiptPaymentData,
  ITaxInvoiceCorporateReceiptWithKey,
  ITaxInvoiceReceipt,
  ITaxInvoiceReceiptWithKey,
} from "src/modules/pdf/common/interfaces";
import { differenceInMinutes, format } from "date-fns";
import { getInterpretingType } from "src/modules/pdf/common/helpers";
import { randomUUID } from "node:crypto";
import { PdfService, PdfTemplatesService } from "src/modules/pdf/services";
import { AwsS3Service } from "src/modules/aws/s3/aws-s3.service";
import { COMPANY_LFH_ID } from "src/modules/companies/common/constants/constants";
import { CORPORATE_CLIENT_ROLES, UNDEFINED_VALUE } from "src/common/constants";
import { EUserRoleName } from "src/modules/users/common/enums";
import { EMembershipType } from "src/modules/memberships/common/enums";
import { OldECurrencies, OldEPaymentStatus, OldERoleType } from "src/modules/payments/common/enums";
import { ESortOrder } from "src/common/enums";
import { UserProfile } from "src/modules/users/entities";
import { OldCalculatePriceDto } from "src/modules/rates-old/common/dto";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { OldIIsGstPayers } from "src/modules/payments/common/interfaces";
import { HelperService } from "src/modules/helper/services";
import { OldRatesService } from "src/modules/rates-old/services";
import { Address } from "src/modules/addresses/entities";
import {
  IPayOutCorporateReceipt,
  IPayOutCorporateReceiptPaymentData,
  IPayOutCorporateReceiptWithKey,
} from "src/modules/pdf/common/interfaces/payout-corporate-receipt.interface";
import { toZonedTime } from "date-fns-tz";
import { TGenerateMembershipInvoiceUserRole } from "src/modules/pdf/common/types";

@Injectable()
export class PdfBuilderService {
  constructor(
    @InjectRepository(OldPayment)
    private readonly paymentRepository: Repository<OldPayment>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly pdfTemplatesService: PdfTemplatesService,
    private readonly pdfService: PdfService,
    private readonly awsS3Service: AwsS3Service,
    private readonly helperService: HelperService,
    private readonly ratesService: OldRatesService,
  ) {}

  public async generatePayInReceipt(paymentId: string): Promise<IPayInReceiptWithKey> {
    const lfhCompany = await findOneOrFail(COMPANY_LFH_ID, this.companyRepository, {
      where: { id: COMPANY_LFH_ID },
      relations: { address: true },
    });

    const payment = await findOneOrFail(paymentId, this.paymentRepository, {
      where: { id: paymentId },
      relations: {
        appointment: {
          client: { profile: true, user: true, address: true, paymentInformation: true, role: true },
          interpreter: { user: true },
        },
        items: true,
        company: {
          address: true,
        },
      },
      order: { items: { creationDate: ESortOrder.ASC } },
    });

    let isCorporate = false;
    let isSameCompanyCommission = false;

    if (payment.company) {
      isCorporate = true;
    }

    if (!payment.appointment) {
      throw new BadRequestException("Appointment not exist!");
    }

    if (!payment.appointment.client) {
      throw new BadRequestException("Appointment client not exist!");
    }

    const clientRole = payment.appointment.client;
    const interpreterRole = payment.appointment.interpreter;

    if (clientRole.operatedByMainCorporateCompanyId === interpreterRole?.operatedByCompanyId) {
      isSameCompanyCommission = true;
    }

    let toUserName: string | null = null;
    let toClientId: string | null = null;
    let clientAddress: Address | null = null;
    let paymentDescription: string | null = null;

    if (isCorporate) {
      if (!payment.company) {
        throw new BadRequestException("Payment company not exist!");
      }

      toUserName = payment.company.name;
      toClientId = payment.company.platformId;
      clientAddress = payment.company.address;
      paymentDescription = `Deposit of the company ${payment.company.platformId}`;
    } else {
      if (!clientRole.paymentInformation) {
        throw new BadRequestException("Payment info not filled!");
      }

      toUserName = this.getUserName(clientRole.profile);
      toClientId = clientRole.user.platformId || "";
      clientAddress = clientRole.address;
      paymentDescription = `Online Credit Card Payment Card# ************${clientRole.paymentInformation.stripeClientLastFour}`; // TODO R: `Online Credit Card Payment ${client.paymentInformation.card.display_brand} Card# ************${client.paymentInformation.stripeClientLastFour}`
    }

    const issueDate = format(new Date(payment.updatingDate), "dd/MM/yyyy");

    let serviceDate = payment.appointment.businessStartTime || payment.appointment.scheduledStartTime;

    if (payment?.appointment?.client?.timezone) {
      serviceDate = toZonedTime(serviceDate, payment.appointment.client.timezone);
    }

    const timezoneForDiscounts = payment.appointment?.interpreter?.timezone ?? payment.appointment.client.timezone;

    const {
      estimatedCostAmount,
      actualTimeAmount,
      promoCodeName,
      promoCodeDiscount,
      promoCodeDiscountAmount,
      mixedPromoCodeName,
      mixedPromoCodeDescription,
      mixedPromoCodeDiscountAmount,
      membershipDescription,
      membershipDiscount,
      membershipDiscountAmount,
    } = await this.getDiscountsInfo(payment, payment.appointment, clientRole, timezoneForDiscounts);

    const interpreterId = payment.appointment?.interpreter?.user?.platformId ?? "External interpreter";

    if (
      !clientAddress ||
      !clientAddress.streetNumber ||
      !clientAddress.streetName ||
      !clientAddress.suburb ||
      !clientAddress.state ||
      !clientAddress.postcode
    ) {
      throw new BadRequestException("Client address does not fill!");
    }

    const receiptData: IPayInReceipt = {
      fromCompanyName: lfhCompany.name,
      fromCompanyABNNumber: lfhCompany.abnNumber!,
      fromCompanyAddress: `${lfhCompany.address.streetNumber} ${lfhCompany.address.streetName}, ${lfhCompany.address.suburb}, ${lfhCompany.address.state}, ${lfhCompany.address.postcode}, ${lfhCompany.address.country}`,
      toUserName,
      toClientId,
      toAddress: `${clientAddress.streetNumber} ${clientAddress.streetName}, ${clientAddress.suburb}, ${clientAddress.state}, ${clientAddress.postcode}, ${clientAddress.country}`,

      receiptNumber: payment.appointment.platformId,

      currency: payment.currency,
      issueDate,
      total: payment.totalAmount,
      gstAmount: payment.totalGstAmount,
      invoiceTotal: payment.totalFullAmount,
      amountPaid: payment.totalFullAmount ? -payment.totalFullAmount : 0,
      amountDue: "0.00",

      paymentDate: issueDate,
      paymentDescription,
      paymentTotal: payment.totalFullAmount ? -payment.totalFullAmount : 0,
      thisInvoiceAmount: payment.totalFullAmount,

      bookingId: payment.appointment.platformId,
      service: isSameCompanyCommission
        ? "Platform Service Fee"
        : `${payment.appointment.schedulingType} ${payment.appointment.communicationType} ${getInterpretingType(payment.appointment.interpreterType)}`,
      topic: payment.appointment.topic,
      appointmentDate: format(serviceDate, "dd MMM yyyy HH:mm"),
      interpreterId,
      duration: getDifferenceInHHMMSS(
        payment.appointment.businessStartTime,
        payment.appointment.businessEndTime || payment.appointment.scheduledEndTime,
      ),

      estimatedCostAmount,
      actualTimeAmount,
      promoCodeName,
      promoCodeDiscount,
      promoCodeDiscountAmount: promoCodeDiscountAmount ? round2(-promoCodeDiscountAmount) : 0,
      mixedPromoCodeName,
      mixedPromoCodeDescription,
      mixedPromoCodeDiscountAmount: mixedPromoCodeDiscountAmount ? round2(-mixedPromoCodeDiscountAmount) : 0,
      membershipDescription,
      membershipDiscount,
      membershipDiscountAmount: membershipDiscountAmount ? round2(-membershipDiscountAmount) : 0,
      subTotalAmount: round2(payment.totalAmount),
      totalAmount: round2(payment.totalFullAmount),
    };

    const docDefinition = this.pdfTemplatesService.payInReceiptTemplate(receiptData);

    const pdfStream = await this.pdfService.generatePdf(docDefinition);

    const key = `payments/lfh-receipts/${randomUUID()}.pdf`;
    await this.awsS3Service.uploadObject(key, pdfStream, "application/pdf");

    return { receiptKey: key, receiptData };
  }

  public async generatePayOutReceipt(paymentId: string): Promise<IPayOutReceiptWithKey> {
    const payment = await findOneOrFail(paymentId, this.paymentRepository, {
      where: { id: paymentId },
      relations: { appointment: { interpreter: { profile: true, user: true } } },
    });

    if (!payment.appointment) {
      throw new BadRequestException("Payment doesn`t have relation to appointment!");
    }

    if (!payment.appointment.interpreter) {
      throw new BadRequestException("Appointment interpreter not fill!");
    }

    const interpreterRole = payment.appointment.interpreter;

    if (!interpreterRole.profile) {
      throw new BadRequestException("Interpreter profile does not fill!");
    }

    if (!payment.appointment) {
      throw new BadRequestException("Payment appointment is not assigned!");
    }

    if (!payment.appointment.businessEndTime) {
      throw new BadRequestException("Appointment business end time not fill!");
    }

    const currentDay = format(new Date(), "dd/MM/yyyy");

    let serviceDate = payment.appointment.businessStartTime || payment.appointment.scheduledStartTime;

    if (payment?.appointment?.interpreter?.timezone) {
      serviceDate = toZonedTime(serviceDate, payment.appointment.interpreter.timezone);
    }

    const receiptData: IPayOutReceipt = {
      receiptNumber: payment.appointment.platformId,
      issueDate: currentDay,
      userName: `${interpreterRole.profile.title}. ${interpreterRole.profile.firstName} ${interpreterRole.profile.lastName}`,
      interpreterId: interpreterRole.user.platformId || "",
      firstName: interpreterRole.profile.firstName,
      fullAmountWithoutCurrency: `${payment.totalFullAmount}`,
      currency: payment.currency,
      amount: `${payment.totalAmount}`,
      gstAmount: `${payment.totalGstAmount}`,
      fullAmount: `${payment.totalFullAmount}`,
      paymentDate: currentDay,
      bookingId: `#${payment.appointment.platformId}`,
      service: `${payment.appointment.schedulingType} ${payment.appointment.communicationType} ${getInterpretingType(payment.appointment.interpreterType)}`,
      topic: payment.appointment.topic,
      duration: getDifferenceInHHMMSS(payment.appointment.businessStartTime, payment.appointment.businessEndTime),
      serviceDate: format(serviceDate, "dd MMM yyyy HH:mm"),
    };

    const docDefinition = this.pdfTemplatesService.payOutReceiptTemplate(receiptData);

    const pdfStream = await this.pdfService.generatePdf(docDefinition);

    const key = `payments/lfh-receipts/${randomUUID()}.pdf`;

    await this.awsS3Service.uploadObject(key, pdfStream, "application/pdf");

    return { receiptKey: key, receiptData };
  }

  public async generateTaxInvoiceReceipt(paymentId: string): Promise<ITaxInvoiceReceiptWithKey> {
    const payment = await findOneOrFail(paymentId, this.paymentRepository, {
      where: { id: paymentId },
      relations: {
        appointment: {
          interpreter: {
            profile: true,
            user: true,
            address: true,
            abnCheck: true,
          },
        },
      },
    });

    if (!payment.appointment) {
      throw new BadRequestException("Payment doesn`t have relation to appointment!");
    }

    if (!payment.appointment.interpreter) {
      throw new BadRequestException("Appointment interpreter not fill!");
    }

    const interpreterRole = payment.appointment.interpreter;

    if (!interpreterRole.profile) {
      throw new BadRequestException("Interpreter profile does not fill!");
    }

    if (
      !interpreterRole.address ||
      !interpreterRole.address.streetNumber ||
      !interpreterRole.address.streetName ||
      !interpreterRole.address.suburb ||
      !interpreterRole.address.state ||
      !interpreterRole.address.postcode
    ) {
      throw new BadRequestException("Interpreter address does not fill!");
    }

    if (
      (!interpreterRole.abnCheck || !interpreterRole.abnCheck.abnNumber) &&
      interpreterRole.role.name !== EUserRoleName.IND_LANGUAGE_BUDDY_INTERPRETER
    ) {
      throw new BadRequestException("Interpreter ABN does not fill!");
    }

    if (!payment.appointment.businessEndTime) {
      throw new BadRequestException("Appointment business end time not fill!");
    }

    const lfhCompany = await findOneOrFail(COMPANY_LFH_ID, this.companyRepository, {
      where: { id: COMPANY_LFH_ID },
      relations: { address: true },
    });

    if (
      !lfhCompany.address.streetNumber ||
      !lfhCompany.address.streetName ||
      !lfhCompany.address.suburb ||
      !lfhCompany.address.state ||
      !lfhCompany.address.postcode ||
      !lfhCompany.abnNumber
    ) {
      throw new InternalServerErrorException("Company LFH data not seeded");
    }

    const currentDay = format(new Date(), "dd/MM/yyyy");

    let serviceDate = payment.appointment.businessStartTime || payment.appointment.scheduledStartTime;

    if (payment?.appointment?.interpreter?.timezone) {
      serviceDate = toZonedTime(serviceDate, payment.appointment.interpreter.timezone);
    }

    const receiptData: ITaxInvoiceReceipt = {
      invoiceDate: currentDay,

      fromInterpreterName: this.getUserName(interpreterRole.profile),
      fromInterpreterId: interpreterRole.user.platformId || "",
      fromInterpreterABNNumber: interpreterRole?.abnCheck?.abnNumber,
      fromInterpreterAddress: `${interpreterRole?.address?.streetNumber} ${interpreterRole?.address?.streetName}, ${interpreterRole?.address?.suburb}, ${interpreterRole?.address?.state}, ${interpreterRole?.address?.postcode}, ${interpreterRole?.address?.country}`,

      toCompanyName: lfhCompany.name,
      toCompanyABNNumber: lfhCompany.abnNumber,
      toCompanyAddress: `${lfhCompany.address.streetNumber} ${lfhCompany.address.streetName}, ${lfhCompany.address.suburb}, ${lfhCompany.address.state}, ${lfhCompany.address.postcode}, ${lfhCompany.address.country}`,

      bookingId: payment.appointment.platformId,
      serviceDate: format(serviceDate, "dd MMM yyyy HH:mm"),
      description: `${payment.appointment.communicationType} interpreting ${payment.appointment.schedulingType} (${payment.appointment.topic})`,
      duration: getDifferenceInHHMMSS(payment.appointment.businessStartTime, payment.appointment.businessEndTime),
      valueExclGST: `${payment.totalAmount}`,
      valueGST: `${payment.totalGstAmount}`,
      total: `${payment.totalFullAmount}`,
      currency: payment.currency,
    };

    const docDefinition = this.pdfTemplatesService.taxInvoiceTemplate(receiptData);

    const pdfStream = await this.pdfService.generatePdf(docDefinition);

    const key = `payments/lfh-receipts/${randomUUID()}.pdf`;
    await this.awsS3Service.uploadObject(key, pdfStream, "application/pdf");

    return { receiptKey: key, receiptData };
  }

  public async generateMembershipInvoice(
    payment: OldPayment,
    userRole: TGenerateMembershipInvoiceUserRole,
    membershipType: EMembershipType,
    currency: OldECurrencies,
  ): Promise<IMembershipInvoiceWithKey> {
    const isUserFromAu: boolean = Boolean(userRole.country);

    if (
      !userRole.address ||
      !userRole.address.streetNumber ||
      !userRole.address.streetName ||
      !userRole.address.suburb ||
      !userRole.address.state ||
      !userRole.address.postcode
    ) {
      throw new BadRequestException("Client address does not fill!");
    }

    const receiptData: IMembershipInvoice = {
      clientName: `${userRole.profile.firstName} ${userRole.profile.lastName}`,
      clientAddress: `${userRole.address.streetNumber} ${userRole.address.streetName}`,
      clientSuburb: userRole.address.suburb,
      clientState: userRole.address.state,
      clientPostcode: userRole.address.postcode || "",
      clientId: userRole.user.platformId || "",
      invoiceDate: format(new Date(), "dd/MM/yyyy"),
      membershipType: membershipType,
      valueExclGST: `${payment.totalAmount} ${currency}`,
      valueGST: `${payment.totalGstAmount} ${currency}`,
      total: `${payment.totalAmount + payment.totalGstAmount} ${currency}`,
    };

    const docDefinition = this.pdfTemplatesService.membershipInvoiceTemplate(receiptData, isUserFromAu);
    const pdfStream = await this.pdfService.generatePdf(docDefinition);

    const key = `payments/lfh-receipts/${randomUUID()}.pdf`;
    await this.awsS3Service.uploadObject(key, pdfStream, "application/pdf");

    return { receiptKey: key, receiptData };
  }

  public async generateInterpreterBadge(
    userRoleId: string,
    interpreterBadge?: string,
  ): Promise<IInterpreterBadgeWithKey> {
    const userRole = await findOneOrFail(userRoleId, this.userRoleRepository, {
      select: {
        id: true,
        operatedByCompanyId: true,
        operatedByCompanyName: true,
        role: {
          id: true,
          name: true,
        },
        user: {
          id: true,
          platformId: true,
          avatarUrl: true,
        },
        profile: {
          id: true,
          firstName: true,
          preferredName: true,
          lastName: true,
          title: true,
        },
        interpreterProfile: {
          id: true,
          interpreterBadge: true,
          averageRating: true,
        },
      },
      where: { id: userRoleId },
      relations: { role: true, user: true, profile: true, interpreterProfile: true },
    });
    const { role, user, profile, interpreterProfile } = userRole;

    if (!interpreterProfile || !interpreterProfile.averageRating || !user.avatarUrl) {
      throw new BadRequestException("Insufficient data to generate interpreter badge.");
    }

    const IS_MEDIA_BUCKET = true;
    const definedInterpreterRole =
      role.name === EUserRoleName.IND_LANGUAGE_BUDDY_INTERPRETER ? "Language Buddy" : "Professional Interpreter";
    const definedCompanyName =
      userRole.operatedByCompanyId !== COMPANY_LFH_ID ? userRole.operatedByCompanyName : UNDEFINED_VALUE;
    const definedInterpreterBadge = interpreterBadge ?? interpreterProfile.interpreterBadge ?? "";

    const interpreterBadgeData: IInterpreterBadge = {
      userRoleId: userRole.id,
      platformId: user.platformId || "",
      firstName: profile.preferredName || profile.firstName,
      lastName: profile.lastName,
      title: profile.title ?? "mr",
      interpreterRole: definedInterpreterRole,
      avatar: user.avatarUrl,
      averageRating: interpreterProfile.averageRating,
      interpreterBadge: definedInterpreterBadge,
      companyName: definedCompanyName,
    };

    const docDefinition = await this.pdfTemplatesService.interpreterBadgeTemplate(interpreterBadgeData);
    const pdfStream = await this.pdfService.generatePdf(docDefinition);

    const key = `users/interpreter-badges/${userRoleId}.pdf`;
    await this.awsS3Service.uploadObject(key, pdfStream, "application/pdf", IS_MEDIA_BUCKET);

    return { interpreterBadgeKey: key, interpreterBadgeData };
  }

  public async generateDepositChargeReceipt(paymentId: string): Promise<IDepositChargeReceiptWithKey> {
    const lfhCompany = await findOneOrFail(COMPANY_LFH_ID, this.companyRepository, {
      where: { id: COMPANY_LFH_ID },
      relations: { address: true },
    });

    const payment = await findOneOrFail(paymentId, this.paymentRepository, {
      where: { id: paymentId },
      relations: {
        items: true,
        company: {
          paymentInformation: true,
          address: true,
          superAdmin: {
            userRoles: true,
          },
        },
      },
      order: { items: { creationDate: ESortOrder.ASC } },
    });

    if (!payment.company) {
      throw new BadRequestException("Company of client not exist!");
    }

    if (!payment.company.paymentInformation) {
      throw new BadRequestException("Payment info not filled!");
    }

    const issueDate = format(new Date(payment.updatingDate), "dd/MM/yyyy");

    let paymentDateTime = new Date(payment.updatingDate);

    if (payment?.company?.superAdmin?.userRoles[0]?.timezone) {
      paymentDateTime = toZonedTime(paymentDateTime, payment?.company?.superAdmin?.userRoles[0]?.timezone);
    }

    const receiptData: IDepositChargeReceipt = {
      fromCompanyName: lfhCompany.name,
      fromCompanyABNNumber: lfhCompany.abnNumber!,
      fromCompanyAddress: `${lfhCompany.address.streetNumber} ${lfhCompany.address.streetName}, ${lfhCompany.address.suburb}, ${lfhCompany.address.state}, ${lfhCompany.address.postcode}, ${lfhCompany.address.country}`,
      toCompanyName: payment.company.name,
      toCompanyABNNumber: payment.company.abnNumber,
      toCompanyId: payment.company.platformId,
      toCompanyAddress: `${payment.company.address.streetNumber} ${payment.company.address.streetName}, ${payment.company.address.suburb}, ${payment.company.address.state}, ${payment.company.address.postcode}, ${payment.company.address.country}`,

      receiptNumber: payment.platformId || "",

      currency: payment.currency,
      issueDate,
      total: payment.totalAmount,
      gstAmount: payment.totalGstAmount,
      invoiceTotal: payment.totalFullAmount,
      amountPaid: payment.totalFullAmount ? -payment.totalFullAmount : 0,
      amountDue: "0.00",

      paymentDate: issueDate,
      paymentDescription: `Back Account# ******${payment.company.paymentInformation.stripeClientLastFour}`,
      paymentTotal: payment.totalFullAmount ? -payment.totalFullAmount : 0,
      thisInvoiceAmount: payment.totalFullAmount,

      transactionId: payment.platformId || "",
      service: "Company Deposit Charge",
      paymentDateTime: format(paymentDateTime, "dd MMM yyyy HH:mm"),
    };

    const docDefinition = this.pdfTemplatesService.depositChargeReceiptTemplate(receiptData);

    const pdfStream = await this.pdfService.generatePdf(docDefinition);

    const key = `payments/lfh-receipts/${randomUUID()}.pdf`;
    await this.awsS3Service.uploadObject(key, pdfStream, "application/pdf");

    return { receiptKey: key, receiptData };
  }

  public async generateCorporatePayOutReceipt(
    payments: OldPayment[],
    company: Company | null,
  ): Promise<IPayOutCorporateReceiptWithKey> {
    const paymentsData: IPayOutCorporateReceiptPaymentData[] = [];

    const currentDay = format(new Date(), "dd/MM/yyyy");

    for (const payment of payments) {
      let serviceDate = payment?.appointment?.businessStartTime || payment?.appointment?.scheduledStartTime;

      if (serviceDate && payment?.appointment?.interpreter?.timezone) {
        serviceDate = toZonedTime(serviceDate, payment.appointment.interpreter.timezone);
      }

      paymentsData.push({
        fullAmountWithoutCurrency: `${payment.totalFullAmount}`,
        currency: payment.currency,
        amount: `${payment.totalAmount}`,
        gstAmount: `${payment.totalGstAmount}`,
        fullAmount: `${payment.totalFullAmount}`,
        paymentDate: currentDay,
        bookingId: `#${payment?.appointment?.platformId}`,
        service: `${payment?.appointment?.schedulingType} ${payment?.appointment?.communicationType} ${getInterpretingType(payment?.appointment?.interpreterType)}`,
        topic: payment?.appointment?.topic || "",
        duration: getDifferenceInHHMMSS(payment?.appointment?.businessStartTime, payment?.appointment?.businessEndTime),
        serviceDate: serviceDate ? format(serviceDate, "dd MMM yyyy HH:mm") : "",
        interpreterId: payment?.appointment?.interpreter?.user?.platformId || "",
      });
    }

    const receiptData: IPayOutCorporateReceipt = {
      receiptNumber: payments[0]?.appointment?.platformId || "",
      issueDate: currentDay,
      companyName: company?.name || "",
      companyAbnNumber: company?.abnNumber,
      companyId: company?.platformId || "",
      adminFirstName: company?.superAdmin?.userRoles[0]?.profile?.firstName || "",
      paymentsData,
    };

    const docDefinition = this.pdfTemplatesService.payOutCorporateReceiptTemplate(receiptData);

    const pdfStream = await this.pdfService.generatePdf(docDefinition);

    const key = `payments/lfh-receipts/${randomUUID()}.pdf`;

    await this.awsS3Service.uploadObject(key, pdfStream, "application/pdf");

    return { receiptKey: key, receiptData };
  }

  public async generateCorporateTaxInvoiceReceipt(
    payments: OldPayment[],
    company: Company | null,
  ): Promise<ITaxInvoiceCorporateReceiptWithKey> {
    const paymentsData: ITaxInvoiceCorporateReceiptPaymentData[] = [];

    for (const payment of payments) {
      if (payment.totalGstAmount > 0) {
        let serviceDate = payment?.appointment?.businessStartTime || payment?.appointment?.scheduledStartTime;

        if (serviceDate && payment?.appointment?.interpreter?.timezone) {
          serviceDate = toZonedTime(serviceDate, payment.appointment.interpreter.timezone);
        }

        paymentsData.push({
          interpreterId: payment?.appointment?.interpreter?.user?.platformId || "",
          bookingId: payment?.appointment?.platformId || "",
          serviceDate: serviceDate ? format(serviceDate, "dd MMM yyyy HH:mm") : "",
          description: `${payment?.appointment?.communicationType} interpreting ${payment?.appointment?.schedulingType} (${payment?.appointment?.topic})`,
          duration: getDifferenceInHHMMSS(
            payment?.appointment?.businessStartTime,
            payment?.appointment?.businessEndTime,
          ),
          valueExclGST: `${payment.totalAmount}`,
          valueGST: `${payment.totalGstAmount}`,
          total: `${payment.totalFullAmount}`,
          currency: payment.currency,
        });
      }
    }

    const currentDay = format(new Date(), "dd/MM/yyyy");

    const lfhCompany = await findOneOrFail(COMPANY_LFH_ID, this.companyRepository, {
      where: { id: COMPANY_LFH_ID },
      relations: { address: true },
    });

    const receiptData: ITaxInvoiceCorporateReceipt = {
      invoiceDate: currentDay,

      fromCompanyName: company?.name || "",
      fromCompanyId: company?.platformId || "",
      fromCompanyABNNumber: company?.abnNumber || "",
      fromCompanyAddress: `${company?.address?.streetNumber} ${company?.address?.streetName}, ${company?.address?.suburb}, ${company?.address?.state}, ${company?.address?.postcode}, ${company?.address?.country}`,

      toCompanyName: lfhCompany.name,
      toCompanyABNNumber: lfhCompany.abnNumber,
      toCompanyAddress: `${lfhCompany.address.streetNumber} ${lfhCompany.address.streetName}, ${lfhCompany.address.suburb}, ${lfhCompany.address.state}, ${lfhCompany.address.postcode}, ${lfhCompany.address.country}`,

      paymentsData,
    };

    const docDefinition = this.pdfTemplatesService.taxInvoiceCorporateTemplate(receiptData);

    const pdfStream = await this.pdfService.generatePdf(docDefinition);

    const key = `payments/lfh-receipts/${randomUUID()}.pdf`;
    await this.awsS3Service.uploadObject(key, pdfStream, "application/pdf");

    return { receiptKey: key, receiptData };
  }

  private getUserName(clientProfile: UserProfile): string {
    let userName = "";

    if (clientProfile.title) {
      userName += `${clientProfile.title} `;
    }

    userName += `${clientProfile.firstName} `;

    if (clientProfile.middleName) {
      userName += `${clientProfile.middleName} `;
    }

    userName += clientProfile.lastName;

    return userName;
  }

  private async getDiscountsInfo(
    payment: OldPayment,
    appointment: Appointment,
    clientUserRole: UserRole,
    interpreterTimezone: string | null,
  ): Promise<IPayInDiscounts> {
    let promoCodeName: string | null = null;
    let promoCodeDiscount: string | null = null;
    let promoCodeDiscountAmount: number = 0;
    let mixedPromoCodeName: string | null = null;
    let mixedPromoCodeDiscount: number | null = null;
    let mixedPromoCodeDiscountMinutes: number | null = null;
    let mixedPromoCodeDiscountAmount: number = 0;
    let membershipType: string | null = null;
    let membershipAppliedMinutes: number | null = null;
    let membershipDiscountPercent: number | null = null;
    let membershipDiscountAmount: number = 0;

    const scheduleDateTime = new Date(appointment.businessStartTime || appointment.scheduledStartTime).toISOString();

    const data: OldCalculatePriceDto = {
      interpreterType: appointment.interpreterType,
      schedulingType: appointment.schedulingType,
      communicationType: appointment.communicationType,
      interpretingType: appointment.interpretingType,
      topic: appointment.topic,
      duration: appointment.schedulingDurationMin,
      scheduleDateTime,
      extraDays: [],
      interpreterTimezone,
    };

    let isNeedCalcAsNormalTime = false;
    let isNeedCalcAsOvertime = false;

    if (appointment.acceptOvertimeRates) {
      isNeedCalcAsOvertime = true;
    } else {
      isNeedCalcAsNormalTime = true;
    }

    let isCorporate = false;
    let country = clientUserRole.country;

    if (isInRoles(CORPORATE_CLIENT_ROLES, clientUserRole.role.name)) {
      isCorporate = true;
      const company = await findOneOrFail(clientUserRole.operatedByCompanyId, this.companyRepository, {
        where: { id: clientUserRole.operatedByCompanyId },
      });

      country = company.country;
    }

    let isGstPayers: OldIIsGstPayers;

    if (isCorporate) {
      isGstPayers = this.helperService.isCorporateGstPayer(country);
    } else {
      isGstPayers = this.helperService.isIndividualGstPayer(country);
    }

    const estimatedCostPrice = await this.ratesService.calculatePriceByOneDay(
      data,
      appointment.schedulingDurationMin,
      scheduleDateTime,
      isGstPayers.client,
      OldERoleType.CLIENT,
      isNeedCalcAsNormalTime,
      isNeedCalcAsOvertime,
    );

    const estimatedCostAmount = round2(estimatedCostPrice.price);

    let fullDuration: number = 0;

    if (appointment.businessEndTime && appointment.businessStartTime) {
      fullDuration = differenceInMinutes(
        new Date(appointment.businessEndTime),
        new Date(appointment.businessStartTime),
      );
    } else if (appointment.businessEndTime && appointment.scheduledStartTime) {
      fullDuration = differenceInMinutes(
        new Date(appointment.businessEndTime),
        new Date(appointment.scheduledStartTime),
      );
    } else {
      fullDuration = differenceInMinutes(
        new Date(appointment.scheduledEndTime),
        new Date(appointment.scheduledStartTime),
      );
    }

    data.duration = fullDuration;

    const actualTimePrice = await this.ratesService.calculatePriceByOneDay(
      data,
      fullDuration,
      scheduleDateTime,
      isGstPayers.client,
      OldERoleType.CLIENT,
      isNeedCalcAsNormalTime,
      isNeedCalcAsOvertime,
    );

    const actualTimeAmount = round2(actualTimePrice.price);

    for (const paymentItem of payment.items) {
      if (paymentItem.status !== OldEPaymentStatus.CAPTURED) {
        continue;
      }

      if (!promoCodeName && !paymentItem.appliedPromoDiscountsMinutes && paymentItem.appliedPromoCode) {
        promoCodeName = paymentItem.appliedPromoCode;
      }

      if (!promoCodeDiscount && !paymentItem.appliedPromoDiscountsMinutes && paymentItem.appliedPromoDiscountsPercent) {
        promoCodeDiscount = `${paymentItem.appliedPromoDiscountsPercent}%`;
      }

      if (paymentItem.amountOfAppliedDiscountByPromoCode && !paymentItem.appliedPromoDiscountsMinutes) {
        promoCodeDiscountAmount =
          Number(promoCodeDiscountAmount) + Number(paymentItem.amountOfAppliedDiscountByPromoCode);
      }

      if (!mixedPromoCodeName && paymentItem.appliedPromoDiscountsMinutes && paymentItem.appliedPromoCode) {
        mixedPromoCodeName = paymentItem.appliedPromoCode;
      }

      if (
        !mixedPromoCodeDiscount &&
        paymentItem.appliedPromoDiscountsMinutes &&
        paymentItem.appliedPromoDiscountsPercent
      ) {
        mixedPromoCodeDiscount = paymentItem.appliedPromoDiscountsPercent;
      }

      if (paymentItem.appliedPromoDiscountsMinutes) {
        if (!mixedPromoCodeDiscountMinutes) {
          mixedPromoCodeDiscountMinutes = paymentItem.appliedPromoDiscountsMinutes;
        } else {
          mixedPromoCodeDiscountMinutes =
            Number(mixedPromoCodeDiscountMinutes) + Number(paymentItem.appliedPromoDiscountsMinutes);
        }
      }

      if (paymentItem.amountOfAppliedDiscountByPromoCode && paymentItem.appliedPromoDiscountsMinutes) {
        mixedPromoCodeDiscountAmount =
          Number(mixedPromoCodeDiscountAmount) + Number(paymentItem.amountOfAppliedDiscountByPromoCode);
      }

      if (!membershipType && paymentItem.appliedMembershipType) {
        membershipType = paymentItem.appliedMembershipType;
      }

      if (!membershipDiscountPercent && paymentItem.appliedMembershipDiscountsPercent) {
        membershipDiscountPercent = paymentItem.appliedMembershipDiscountsPercent;
      }

      if (paymentItem.appliedMembershipFreeMinutes) {
        if (!membershipAppliedMinutes) {
          membershipAppliedMinutes = paymentItem.appliedMembershipFreeMinutes;
        } else {
          membershipAppliedMinutes =
            Number(membershipAppliedMinutes) + Number(paymentItem.appliedMembershipFreeMinutes);
        }
      }

      if (paymentItem.amountOfAppliedDiscountByMembershipMinutes) {
        membershipDiscountAmount =
          Number(membershipDiscountAmount) + Number(paymentItem.amountOfAppliedDiscountByMembershipMinutes);
      }

      if (paymentItem.amountOfAppliedDiscountByMembershipDiscount) {
        membershipDiscountAmount =
          Number(membershipDiscountAmount) + Number(paymentItem.amountOfAppliedDiscountByMembershipDiscount);
      }
    }

    let mixedPromoCodeDescription: string | null = null;
    let membershipDescription: string | null = null;
    let membershipDiscount: string | null = null;

    if (mixedPromoCodeDiscount && mixedPromoCodeDiscountMinutes) {
      mixedPromoCodeDescription = `${mixedPromoCodeDiscount}% for ${mixedPromoCodeDiscountMinutes} minutes`;
    }

    if (membershipAppliedMinutes) {
      membershipDescription = `${membershipType} - free minutes`;
      membershipDiscount = `${membershipAppliedMinutes} mins`;
    }

    if (membershipDiscount) {
      if (!membershipDescription) {
        membershipDescription = `${membershipType} - discount`;
        membershipDiscount = `${membershipDiscountPercent}%`;
      } else {
        membershipDescription += `, discount`;
        membershipDiscount += `, ${membershipDiscountPercent}%`;
      }
    }

    return {
      estimatedCostAmount,
      actualTimeAmount,
      promoCodeName,
      promoCodeDiscount,
      promoCodeDiscountAmount,
      mixedPromoCodeName,
      mixedPromoCodeDescription,
      mixedPromoCodeDiscountAmount,
      membershipDescription,
      membershipDiscount,
      membershipDiscountAmount,
    };
  }
}
