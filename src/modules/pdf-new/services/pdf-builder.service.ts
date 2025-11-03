import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Company } from "src/modules/companies/entities";
import { findOneOrFailTyped, getDifferenceInHHMMSS } from "src/common/utils";
import {
  ICorporatePayOutReceipt,
  ICorporatePayOutReceiptPayment,
  ICorporateTaxInvoiceReceipt,
  ICorporateTaxInvoiceReceiptPayment,
  IDepositChargeReceipt,
  IGenerateCorporatePayOutReceipt,
  IGenerateCorporateTaxInvoiceReceipt,
  IGenerateInterpreterBadge,
  IGenerateMembershipInvoice,
  IGeneratePayInReceipt,
  IGeneratePayOutReceipt,
  IGenerateTaxInvoiceReceipt,
  IInterpreterBadge,
  ILfhCompanyPdfData,
  IMembershipInvoice,
  IPayInReceipt,
  IPayInReceiptDiscountsSummary,
  IPayOutReceipt,
  IRecipientPdfData,
  ITaxInvoiceReceipt,
} from "src/modules/pdf-new/common/interfaces";
import { format } from "date-fns";
import { COMPANY_LFH_ID } from "src/modules/companies/common/constants/constants";
import { toZonedTime } from "date-fns-tz";
import {
  LoadLfhCompanyPdfDataQuery,
  TGetAppointmentDate,
  TGetAppointmentServiceType,
  TGetFullAddress,
  TGetFullUserName,
  TLoadLfhCompanyPdfData,
  TLoadRecipientPdfDataCompany,
  TLoadRecipientPdfDataUserRole,
} from "src/modules/pdf-new/common/types";
import { EAppointmentInterpreterType } from "src/modules/appointments/appointment/common/enums";
import { IPaymentCalculationResult } from "src/modules/payments-new/common/interfaces";
import { UNDEFINED_VALUE } from "src/common/constants";
import { EExtCountry } from "src/modules/addresses/common/enums";
import { EUserRoleName } from "src/modules/users/common/enums";
import { TWebhookPaymentIntentSucceededPayment } from "src/modules/webhook-processor/common/types";

@Injectable()
export class PdfBuilderService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  public async buildPayInReceiptData(data: IGeneratePayInReceipt): Promise<IPayInReceipt> {
    const { payment, appointment, prices } = data;

    const lfhCompanyData = await this.loadLfhCompanyPdfData();
    const recipientData = this.loadRecipientPdfData(payment.company, appointment.client);
    const discountSummary = this.calculatePdfDiscountSummary(prices);

    const isSameCompanyCommission = appointment.interpreter
      ? appointment.client.operatedByMainCorporateCompanyId === appointment.interpreter.operatedByCompanyId
      : false;
    const determinedAppointmentServiceType = isSameCompanyCommission
      ? "Platform Service Fee"
      : this.getAppointmentServiceType(appointment);

    return {
      lfhCompanyData,
      recipientData,
      appointment,
      payment,
      discountSummary,
      issueDate: format(new Date(data.payment.updatingDate), "dd/MM/yyyy"),
      appointmentServiceType: determinedAppointmentServiceType,
      appointmentDate: this.getAppointmentDate(appointment, appointment.client.timezone),
      interpreter: appointment.interpreter ? appointment.interpreter.user.platformId : "External Interpreter",
      totalDuration: getDifferenceInHHMMSS(appointment.businessStartTime, appointment.businessEndTime),
    };
  }

  public async buildPayOutReceiptData(data: IGeneratePayOutReceipt): Promise<IPayOutReceipt> {
    const { appointment, paymentRecordResult, interpreter } = data;
    const { payment } = paymentRecordResult;

    const recipientData = this.loadRecipientPdfData(payment.company, interpreter);
    const appointmentServiceType = this.getAppointmentServiceType(appointment);

    return {
      recipientData,
      appointmentServiceType,
      appointment,
      payment,
      interpreter,
      issueDate: format(new Date(), "dd/MM/yyyy"),
      totalDuration: getDifferenceInHHMMSS(appointment.businessStartTime, appointment.businessEndTime),
      appointmentDate: this.getAppointmentDate(appointment, interpreter.timezone),
    };
  }

  public async buildTaxInvoiceReceiptData(data: IGenerateTaxInvoiceReceipt): Promise<ITaxInvoiceReceipt> {
    const { paymentRecordResult, interpreter, appointment } = data;
    const { payment } = paymentRecordResult;

    const lfhCompanyData = await this.loadLfhCompanyPdfData();
    const recipientData = this.loadRecipientPdfData(payment.company, interpreter);

    return {
      lfhCompanyData,
      recipientData,
      appointment,
      payment,
      issueDate: format(new Date(), "dd/MM/yyyy"),
      appointmentDescription: `${appointment.communicationType} interpreting ${appointment.schedulingType} (${appointment.topic})`,
      totalDuration: getDifferenceInHHMMSS(appointment.businessStartTime, appointment.businessEndTime),
      appointmentDate: this.getAppointmentDate(appointment, interpreter.timezone),
    };
  }

  public async buildMembershipInvoiceData(data: IGenerateMembershipInvoice): Promise<IMembershipInvoice> {
    const { payment, userRole, membershipType } = data;

    return {
      payment,
      userRole,
      membershipType,
      isUserFromAu: userRole.country === EExtCountry.AUSTRALIA,
      issueDate: format(new Date(), "dd/MM/yyyy"),
    };
  }

  public async buildInterpreterBadgeData(data: IGenerateInterpreterBadge): Promise<IInterpreterBadge> {
    const { userRole, newInterpreterBadge } = data;

    const definedInterpreterBadge = newInterpreterBadge ?? userRole.interpreterProfile.interpreterBadge;
    const definedInterpreterRole =
      userRole.role.name === EUserRoleName.IND_LANGUAGE_BUDDY_INTERPRETER
        ? "Language Buddy"
        : "Professional Interpreter";
    const definedCompanyName =
      userRole.operatedByCompanyId !== COMPANY_LFH_ID ? userRole.operatedByCompanyName : UNDEFINED_VALUE;

    return {
      userRole,
      interpreterBadge: definedInterpreterBadge,
      interpreterRole: definedInterpreterRole,
      companyName: definedCompanyName,
    };
  }

  public async buildDepositChargeReceiptData(
    payment: TWebhookPaymentIntentSucceededPayment,
  ): Promise<IDepositChargeReceipt> {
    const { company } = payment;
    const lfhCompanyData = await this.loadLfhCompanyPdfData();
    const recipientData = this.loadRecipientPdfData(payment.company, null);

    let paymentDateTime = new Date(payment.updatingDate);

    if (company.superAdmin?.userRoles[0].timezone) {
      paymentDateTime = toZonedTime(paymentDateTime, company.superAdmin?.userRoles[0].timezone);
    }

    return {
      payment,
      lfhCompanyData,
      recipientData,
      issueDate: format(new Date(payment.updatingDate), "dd/MM/yyyy"),
      paymentDescription: `Back Account# ******${payment.company.paymentInformation.stripeClientLastFour}`,
      paymentDate: format(paymentDateTime, "dd MMM yyyy HH:mm"),
      service: "Company Deposit Charge",
    };
  }

  public async buildCorporatePayOutReceipt(data: IGenerateCorporatePayOutReceipt): Promise<ICorporatePayOutReceipt> {
    const { payments, company } = data;
    const receiptNumber = payments[0].appointment.platformId;
    const adminFirstName = company.superAdmin?.userRoles[0].profile.firstName;
    const recipientData = this.loadRecipientPdfData(company, null);

    const paymentsData: ICorporatePayOutReceiptPayment[] = [];
    for (const payment of payments) {
      const { appointment } = payment;
      const appointmentDate = this.getAppointmentDate(appointment, appointment.interpreter.timezone);
      const appointmentServiceType = this.getAppointmentServiceType(appointment);

      paymentsData.push({
        payment,
        appointmentDate,
        appointmentServiceType,
        totalDuration: getDifferenceInHHMMSS(appointment.businessStartTime, appointment.businessEndTime),
      });
    }

    return {
      recipientData,
      receiptNumber,
      issueDate: format(new Date(), "dd/MM/yyyy"),
      adminFirstName,
      paymentsData,
    };
  }

  public async buildCorporateTaxInvoiceReceipt(
    data: IGenerateCorporateTaxInvoiceReceipt,
  ): Promise<ICorporateTaxInvoiceReceipt> {
    const { payments, company } = data;
    const lfhCompanyData = await this.loadLfhCompanyPdfData();
    const recipientData = this.loadRecipientPdfData(company, null);

    const paymentsData: ICorporateTaxInvoiceReceiptPayment[] = [];
    for (const payment of payments) {
      const { appointment } = payment;
      const appointmentDate = this.getAppointmentDate(appointment, appointment.interpreter.timezone);
      const appointmentServiceType = this.getAppointmentServiceType(appointment);
      const appointmentDescription = `${appointment.communicationType} interpreting ${appointment.schedulingType} (${appointment.topic})`;

      paymentsData.push({
        payment,
        appointmentDate,
        appointmentServiceType,
        appointmentDescription,
        totalDuration: getDifferenceInHHMMSS(appointment.businessStartTime, appointment.businessEndTime),
      });
    }

    return {
      lfhCompanyData,
      recipientData,
      issueDate: format(new Date(), "dd/MM/yyyy"),
      paymentsData,
    };
  }

  private async loadLfhCompanyPdfData(): Promise<ILfhCompanyPdfData> {
    const lfhCompany = await findOneOrFailTyped<TLoadLfhCompanyPdfData>(COMPANY_LFH_ID, this.companyRepository, {
      select: LoadLfhCompanyPdfDataQuery.select,
      where: { id: COMPANY_LFH_ID },
      relations: LoadLfhCompanyPdfDataQuery.relations,
    });

    return {
      companyName: lfhCompany.name,
      abnNumber: lfhCompany.abnNumber,
      companyAddress: this.getFullAddress(lfhCompany.address),
    };
  }

  private loadRecipientPdfData(
    company: TLoadRecipientPdfDataCompany | null,
    userRole: TLoadRecipientPdfDataUserRole | null,
  ): IRecipientPdfData {
    if (company) {
      return {
        recipientName: company.name,
        recipientId: company.platformId,
        recipientAddress: this.getFullAddress(company.address),
        description: `Deposit of the company ${company.platformId}`,
      };
    } else if (userRole) {
      return {
        recipientName: this.getFullUserName(userRole),
        recipientId: userRole.user.platformId,
        recipientAddress: this.getFullAddress(userRole.address),
        recipientAbnNumber: userRole.abnCheck?.abnNumber ?? UNDEFINED_VALUE,
        description: `Online Credit Card Payment Card# ************${userRole.paymentInformation.stripeClientLastFour}`,
      };
    }

    return {
      recipientName: "",
      recipientId: "",
      recipientAddress: "",
      description: "",
    };
  }

  private getFullUserName(userRole: TGetFullUserName): string {
    const { title, firstName, middleName, lastName } = userRole.profile;

    return [title, firstName, middleName, lastName].filter(Boolean).join(" ");
  }

  private getFullAddress(address: TGetFullAddress): string {
    const { streetNumber, streetName, suburb, state, postcode, country } = address;

    return [streetNumber, streetName, suburb, state, postcode, country].filter(Boolean).join(", ");
  }

  private getAppointmentServiceType(appointment: TGetAppointmentServiceType): string {
    let interpretingType: string = "";

    if (appointment.interpreterType === EAppointmentInterpreterType.IND_PROFESSIONAL_INTERPRETER) {
      interpretingType = "Professional Interpreting";
    } else {
      interpretingType = "Language Buddy";
    }

    return `${appointment.schedulingType} ${appointment.communicationType} ${interpretingType}`;
  }

  private getAppointmentDate(appointment: TGetAppointmentDate, timezone: string): string {
    const serviceDate = toZonedTime(appointment.businessStartTime, timezone);

    return format(serviceDate, "dd MMM yyyy HH:mm");
  }

  private calculatePdfDiscountSummary(prices: IPaymentCalculationResult): IPayInReceiptDiscountsSummary | null {
    if (!prices.appliedDiscounts || !prices.discountRate) {
      return null;
    }

    const { appliedDiscounts, discountRate } = prices;

    let mixedPromoCodeDescription: string | null = null;
    let promoCodeDiscountDescription: string | null = null;
    let membershipDescription: string | null = null;
    let membershipDiscountDescription: string | null = null;

    if (appliedDiscounts.promoCampaignDiscount > 0 && appliedDiscounts.promoCampaignMinutesUsed > 0) {
      if (discountRate.promoCampaignDiscount && discountRate.promoCampaignDiscount > 0) {
        mixedPromoCodeDescription = `${discountRate.promoCampaignDiscount}% for ${appliedDiscounts.promoCampaignMinutesUsed} minutes`;
      }
    }

    if (
      !promoCodeDiscountDescription &&
      !appliedDiscounts.promoCampaignMinutesUsed &&
      discountRate.promoCampaignDiscount
    ) {
      promoCodeDiscountDescription = `${discountRate.promoCampaignDiscount}%`;
    }

    if (appliedDiscounts.membershipFreeMinutesUsed > 0) {
      membershipDescription = `${discountRate.membershipType} - free minutes`;
      membershipDiscountDescription = `${appliedDiscounts.membershipFreeMinutesUsed} mins`;
    }

    if (discountRate.membershipDiscount && discountRate.membershipDiscount > 0) {
      if (!membershipDescription) {
        membershipDescription = `${discountRate.membershipType} - discount`;
        membershipDiscountDescription = `${discountRate.membershipDiscount}%`;
      } else {
        membershipDescription += `, discount`;
        membershipDiscountDescription += `, ${discountRate.membershipDiscount}%`;
      }
    }

    return {
      mixedPromoCodeDescription,
      promoCodeDiscountDescription,
      membershipDescription,
      membershipDiscountDescription,
      discountRate,
      appliedDiscounts,
    };
  }
}
