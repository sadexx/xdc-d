import { Injectable } from "@nestjs/common";
import { DiscountsService } from "src/modules/discounts/services";
import { BillingSummary } from "src/modules/rates/common/interfaces";
import { RatesService } from "src/modules/rates/services";
import { IDiscountRate } from "src/modules/discounts/common/interfaces";
import { TCalculatePaymentPriceAppointment } from "src/modules/payments/common/types/pricing";
import { isCorporateGstPayer, isIndividualGstPayer } from "src/modules/payments/common/helpers";
import { TAppointmentCalculation } from "src/modules/rates/common/types";
import {
  ICalculatePaymentStartPrice,
  IPaymentCalculationResult,
  ICalculateAdditionalBlockPrice,
  ICalculatePaymentEndPrice,
} from "src/modules/payments/common/interfaces/pricing";

@Injectable()
export class PaymentsPriceCalculationService {
  constructor(
    private readonly ratesService: RatesService,
    private readonly discountsService: DiscountsService,
  ) {}

  /**
   * Calculates payment price at appointment start time.
   *
   * Determines client GST status based on country and calculates the initial appointment
   * price including all rates and GST. Used when authorizing payment at appointment creation.
   *
   * @param data - Calculation data containing appointment, client type, and country
   * @returns Payment calculation result with client amounts, GST, and full amount
   */
  public async calculatePaymentStartPrice(data: ICalculatePaymentStartPrice): Promise<IPaymentCalculationResult> {
    const { appointment, isClientCorporate, country } = data;
    const appointmentCalculation = this.constructAppointmentCalculation(appointment);

    const isClientGstPayer = this.determineClientGstStatus(isClientCorporate, country);

    const billingSummary = await this.ratesService.calculateAppointmentStartPrice(
      appointmentCalculation,
      isClientGstPayer,
    );

    return this.buildPaymentCalculationResult(billingSummary);
  }

  /**
   * Calculates price for additional time blocks during appointment extension.
   *
   * Determines both client and interpreter GST status, fetches applicable extension discount,
   * and calculates pricing for the additional block duration. Used when extending appointments.
   *
   * @param data - Calculation data with appointment, corporate flags, country, and block duration
   * @returns Payment calculation result with amounts and applied discount rate
   */
  public async calculatePaymentAdditionalBlockPrice(
    data: ICalculateAdditionalBlockPrice,
  ): Promise<IPaymentCalculationResult> {
    const { appointment, isClientCorporate, isInterpreterCorporate, country, additionalBlockDuration } = data;
    const appointmentCalculation = this.constructAppointmentCalculation(appointment);

    const isClientGstPayer = this.determineClientGstStatus(isClientCorporate, country);
    const isInterpreterGstPayer = appointment.interpreter
      ? this.determineInterpreterGstStatus(appointment.interpreter, isInterpreterCorporate, country)
      : false;

    const discountRate = await this.discountsService.fetchDiscountRateForExtension(
      additionalBlockDuration,
      appointment,
    );

    const billingSummary = await this.ratesService.calculateSingleBlock(
      appointmentCalculation,
      additionalBlockDuration,
      isClientGstPayer,
      isInterpreterGstPayer,
      discountRate,
    );

    return this.buildPaymentCalculationResult(billingSummary, discountRate);
  }

  /**
   * Calculates final payment price at appointment end time.
   *
   * Recalculates pricing based on actual appointment duration, determines GST status for
   * both client and interpreter, and applies any discount rates. Used during payment capture.
   *
   * @param data - Calculation data with appointment, corporate flags, and countries for both parties
   * @returns Payment calculation result with final amounts and applied discount rate
   */
  public async calculatePaymentEndPrice(data: ICalculatePaymentEndPrice): Promise<IPaymentCalculationResult> {
    const { appointment, isClientCorporate, isInterpreterCorporate, clientCountry, interpreterCountry } = data;
    const appointmentCalculation = this.constructAppointmentCalculation(appointment);

    const isClientGstPayer = this.determineClientGstStatus(isClientCorporate, clientCountry);
    const isInterpreterGstPayer =
      appointment.interpreter && interpreterCountry
        ? this.determineInterpreterGstStatus(appointment.interpreter, isInterpreterCorporate, interpreterCountry)
        : false;

    const discountRate = await this.discountsService.fetchDiscountRate(appointment.id);

    const billingSummary: BillingSummary = await this.ratesService.calculateAppointmentEndPrice(
      appointmentCalculation,
      isClientGstPayer,
      isInterpreterGstPayer,
      discountRate,
    );

    return this.buildPaymentCalculationResult(billingSummary, discountRate);
  }

  private determineClientGstStatus(isClientCorporate: boolean, country: string): boolean {
    if (isClientCorporate) {
      const gstStatus = isCorporateGstPayer(country);

      return gstStatus.client;
    } else {
      const gstStatus = isIndividualGstPayer(country);

      return gstStatus.client;
    }
  }

  private determineInterpreterGstStatus(
    interpreter: NonNullable<TCalculatePaymentPriceAppointment["interpreter"]>,
    isInterpreterCorporate: boolean,
    country: string,
  ): boolean {
    if (isInterpreterCorporate) {
      const gstStatus = isCorporateGstPayer(null, country);

      return gstStatus.interpreter;
    } else {
      const gstStatus = isIndividualGstPayer(null, interpreter.abnCheck?.gstFromClient);

      return gstStatus.interpreter;
    }
  }

  private constructAppointmentCalculation(appointment: TCalculatePaymentPriceAppointment): TAppointmentCalculation {
    const determinedBusinessStartTime = appointment.businessStartTime ?? appointment.scheduledStartTime;
    const determinedBusinessEndTime = appointment.businessEndTime ?? appointment.scheduledEndTime;

    return {
      id: appointment.id,
      platformId: appointment.platformId,
      schedulingDurationMin: appointment.schedulingDurationMin,
      topic: appointment.topic,
      timezone: appointment.timezone,
      communicationType: appointment.communicationType,
      schedulingType: appointment.schedulingType,
      interpreterType: appointment.interpreterType,
      interpretingType: appointment.interpretingType,
      acceptOvertimeRates: appointment.acceptOvertimeRates,
      scheduledStartTime: appointment.scheduledStartTime.toISOString(),
      businessStartTime: determinedBusinessStartTime.toISOString(),
      businessEndTime: determinedBusinessEndTime.toISOString(),
      interpreterTimezone: appointment.interpreter?.timezone ?? appointment.client.timezone,
    };
  }

  private buildPaymentCalculationResult(
    billingSummary: BillingSummary,
    discountRate?: IDiscountRate,
  ): IPaymentCalculationResult {
    return {
      clientAmount: billingSummary.clientAmount,
      clientGstAmount: billingSummary.clientGstAmount,
      clientFullAmount: billingSummary.clientFullAmount,
      interpreterAmount: billingSummary.interpreterAmount,
      interpreterGstAmount: billingSummary.interpreterGstAmount,
      interpreterFullAmount: billingSummary.interpreterFullAmount,
      appliedDiscounts: billingSummary.appliedDiscounts,
      discountRate,
    };
  }
}
