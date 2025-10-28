import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Company } from "src/modules/companies/entities";
import { findOneOrFailTyped, getDifferenceInHHMMSS } from "src/common/utils";
import {
  IGeneratePayInReceipt,
  ILfhCompanyPdfData,
  IPayInReceipt,
  IPayInReceiptDiscountsSummary,
  IRecipientPdfData,
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
  TLoadRecipientPdfDataPayment,
  TLoadRecipientPdfDataUserRole,
} from "src/modules/pdf-new/common/types";
import { EAppointmentInterpreterType } from "src/modules/appointments/appointment/common/enums";
import { IPaymentCalculationResult } from "src/modules/payments-new/common/interfaces";

@Injectable()
export class PdfBuilderService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  public async buildPayInReceiptData(data: IGeneratePayInReceipt): Promise<IPayInReceipt> {
    const { payment, appointment, prices } = data;

    const lfhCompanyData = await this.loadLfhCompanyPdfData();
    const recipientData = this.loadRecipientPdfData(payment, appointment.client);
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
      appointmentDate: this.getAppointmentDate(appointment),
      interpreter: appointment.interpreter ? appointment.interpreter.user.platformId : "External Interpreter",
      totalDuration: getDifferenceInHHMMSS(appointment.businessStartTime, appointment.businessEndTime),
    };
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
    payment: TLoadRecipientPdfDataPayment,
    userRole: TLoadRecipientPdfDataUserRole,
  ): IRecipientPdfData {
    const { company } = payment;

    if (company) {
      return {
        recipientName: company.name,
        recipientId: company.platformId,
        recipientAddress: this.getFullAddress(company.address),
        description: `Deposit of the company ${company.platformId}`,
      };
    } else {
      return {
        recipientName: this.getFullUserName(userRole),
        recipientId: userRole.user.platformId,
        recipientAddress: this.getFullAddress(userRole.address),
        description: `Online Credit Card Payment Card# ************${userRole.paymentInformation.stripeClientLastFour}`,
      };
    }
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

  private getAppointmentDate(appointment: TGetAppointmentDate): string {
    const serviceDate = toZonedTime(appointment.businessStartTime, appointment.client.timezone);

    return format(serviceDate, "dd MMM yyyy HH:mm");
  }
}
