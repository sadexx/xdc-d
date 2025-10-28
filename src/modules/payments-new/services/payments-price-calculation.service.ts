import { Injectable } from "@nestjs/common";
import {
  ICalculateAdditionalBlockPrice,
  ICalculatePaymentEndPrice,
  ICalculatePaymentStartPrice,
  IPaymentCalculationResult,
} from "src/modules/payments-new/common/interfaces";
import { DiscountsService } from "src/modules/discounts/services";
import { BillingSummary } from "src/modules/rates/common/interfaces";
import { RatesService } from "src/modules/rates/services";
import { IDiscountRate } from "src/modules/discounts/common/interfaces";
import { TCalculatePaymentPriceAppointment } from "src/modules/payments-new/common/types";
import { isCorporateGstPayer, isIndividualGstPayer } from "src/modules/payments-new/common/helpers";
import { TAppointmentCalculation } from "src/modules/rates/common/types";

@Injectable()
export class PaymentsPriceCalculationService {
  constructor(
    private readonly ratesService: RatesService,
    private readonly discountsService: DiscountsService,
  ) {}

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

  public async calculatePaymentAdditionalBlockPrice(
    data: ICalculateAdditionalBlockPrice,
  ): Promise<IPaymentCalculationResult> {
    const { appointment, isClientCorporate, isInterpreterCorporate, country, additionalBlockDuration, discountRate } =
      data;

    const appointmentCalculation = this.constructAppointmentCalculation(appointment);

    const isClientGstPayer = this.determineClientGstStatus(isClientCorporate, country);
    const isInterpreterGstPayer = appointment.interpreter
      ? this.determineInterpreterGstStatus(appointment.interpreter, isInterpreterCorporate, country)
      : false;

    const billingSummary = await this.ratesService.calculateSingleBlock(
      appointmentCalculation,
      additionalBlockDuration,
      isClientGstPayer,
      isInterpreterGstPayer,
      discountRate,
    );

    return this.buildPaymentCalculationResult(billingSummary, discountRate);
  }

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
      businessStartTime: appointment.businessStartTime ?? appointment.scheduledStartTime,
      businessEndTime: appointment.businessEndTime ?? appointment.scheduledEndTime,
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
