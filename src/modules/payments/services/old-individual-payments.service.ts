import { BadRequestException, Injectable, UnprocessableEntityException } from "@nestjs/common";
import Stripe from "stripe";
import { randomUUID } from "node:crypto";
import { StripeService } from "src/modules/stripe/services";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { OldPayment, OldPaymentItem } from "src/modules/payments/entities";
import {
  OldECurrencies,
  OldECustomerType,
  OldEPayInStatus,
  OldEPaymentDirection,
  OldEPaymentFailedReason,
  OldEPaymentStatus,
  OldEStripeInterpreterPayoutType,
} from "src/modules/payments/common/enums";
import { denormalizedAmountToNormalized, findOneOrFail, round2 } from "src/common/utils";
import { PdfBuilderService } from "src/modules/pdf/services";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { AwsS3Service } from "src/modules/aws/s3/aws-s3.service";
import { EmailsService } from "src/modules/emails/services";
import { OldITransferReturnedInfo } from "src/modules/payments/common/interfaces";
import { PaypalSdkService } from "src/modules/paypal/services";
import { IPayoutResponse } from "src/modules/paypal/common/interfaces";
import { ConfigService } from "@nestjs/config";
import { EAppointmentStatus } from "src/modules/appointments/appointment/common/enums";
import { LokiLogger } from "src/common/logger";
import { NotificationService } from "src/modules/notifications/services";
import { OldICreateTransfer } from "src/modules/payments/common/interfaces/old-create-transfer.interface";
import { EPaymentSystem } from "src/modules/payment-information/common/enums";
import { ESortOrder } from "src/common/enums";
import { OldPaymentsHelperService } from "src/modules/payments/services/old-payments-helper.service";
import {
  NUMBER_OF_MINUTES_IN_DAY,
  NUMBER_OF_MINUTES_IN_HALF_HOUR,
  NUMBER_OF_MINUTES_IN_SIX_HOURS,
} from "src/common/constants";
import { differenceInMinutes } from "date-fns";

@Injectable()
export class OldIndividualPaymentsService {
  private readonly lokiLogger = new LokiLogger(OldIndividualPaymentsService.name);
  private readonly BACK_END_URL: string;

  public constructor(
    @InjectRepository(OldPayment)
    private readonly paymentRepository: Repository<OldPayment>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(OldPaymentItem)
    private readonly paymentItemRepository: Repository<OldPaymentItem>,
    private readonly stripeService: StripeService,
    private readonly pdfBuilderService: PdfBuilderService,
    private readonly awsS3Service: AwsS3Service,
    private readonly emailsService: EmailsService,
    private readonly paypalSdkService: PaypalSdkService,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
    private readonly paymentsHelperService: OldPaymentsHelperService,
  ) {
    this.BACK_END_URL = this.configService.getOrThrow<string>("appUrl");
  }

  /*
   * Individual client, pay in, stripe
   */

  /**
   * Authorizes a payment for a specific appointment by interacting with the Stripe service.
   *
   * @param {number} amount - The payment amount, denormalized (e.g., 2.25).
   * @param {number} gstAmount - The GST (Goods and Services Tax) amount for the payment, denormalized (e.g., 0.25).
   * @param {string} appointmentId - The unique identifier of the appointment for which the payment is being authorized.
   * @param discounts
   * @param discountByPercent
   * @param discountByFreeMinutes
   * @param {OldECurrencies} [currency=ECurrencies.AUD] - The currency of the payment (default is AUD).
   * @returns {Promise<void>} - A promise that resolves when the payment authorization process completes or rejects with an exception if an error occurs.
   *
   * @example
   * await authorizePayment(2.25, 0.25, "0470e502-fe0e-497d-9ddc-79862101b5bb", ECurrencies.USD);
   */
  public async authorizePayment(
    amount: number,
    gstAmount: number,
    appointmentId: string,
    currency: OldECurrencies = OldECurrencies.AUD,
    isAdditionalTime: boolean = false,
    isShortTimeSlot?: boolean,
  ): Promise<OldEPayInStatus> {
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

    if (payment && payment.items && payment.items.length > 0) {
      const capturedItemsCount = payment.items.filter((item) => item.status === OldEPaymentStatus.CAPTURED).length;

      if (capturedItemsCount > 0) {
        throw new BadRequestException("Payment already captured!");
      }
    }

    if (!appointment.client.paymentInformation) {
      await this.changeAppointmentStatusToCancelledBySystem(appointment.id);
      this.sendAuthorizationPaymentFailedNotification(appointment, OldEPaymentFailedReason.INFO_NOT_FILLED);
      throw new BadRequestException("Payment info not filled!");
    }

    if (
      !appointment.client.paymentInformation.stripeClientPaymentMethodId ||
      !appointment.client.paymentInformation.stripeClientAccountId
    ) {
      await this.changeAppointmentStatusToCancelledBySystem(appointment.id);
      this.sendAuthorizationPaymentFailedNotification(appointment, OldEPaymentFailedReason.INFO_NOT_FILLED);
      throw new BadRequestException("Stripe payment info not filled!");
    }

    let paymentIntent;
    let paymentStatus: OldEPaymentStatus = OldEPaymentStatus.AUTHORIZED;
    let paymentNote: string | null | undefined = null;

    if (amount > 0) {
      try {
        paymentIntent = await this.stripeService.authorizePayment(
          denormalizedAmountToNormalized(Number(amount) + Number(gstAmount)),
          currency,
          appointment.client.paymentInformation.stripeClientPaymentMethodId,
          appointment.client.paymentInformation.stripeClientAccountId,
          appointment.platformId,
        );

        if (paymentIntent.next_action) {
          this.lokiLogger.warn(`STRIPE AUTHORIZE, REQUIRED NEXT ACTION, appointment id: ${appointmentId}`);
        } // TODO check
      } catch (error) {
        paymentStatus = OldEPaymentStatus.AUTHORIZATION_FAILED;
        paymentNote = (error as Stripe.Response<Stripe.StripeRawError>).message ?? null;
      }
    }

    const paymentMethodInfo = `Credit Card ${appointment.client.paymentInformation.stripeClientLastFour}`;

    if (!payment) {
      const newPayment = this.paymentRepository.create({
        direction: OldEPaymentDirection.INCOMING,
        customerType: OldECustomerType.INDIVIDUAL,
        fromClient: appointment.client,
        appointment,
        system: EPaymentSystem.STRIPE,
        totalAmount: amount,
        totalGstAmount: gstAmount,
        totalFullAmount: amount + gstAmount,
        currency,
        paymentMethodInfo,
      });

      payment = await this.paymentRepository.save(newPayment);
    } else {
      if (payment.currency !== currency) {
        await this.changeAppointmentStatusToCancelledBySystem(appointment.id);

        this.sendAuthorizationPaymentFailedNotification(appointment, OldEPaymentFailedReason.INCORRECT_CURRENCY);

        throw new BadRequestException(
          "New payment item currency must been the same like other payment items currencies",
        );
      }
    }

    const paymentItem = this.paymentItemRepository.create({
      payment,
      externalId: paymentIntent?.id,
      amount,
      gstAmount,
      fullAmount: amount + gstAmount,
      currency,
      status: paymentStatus,
      note: paymentNote,
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
      // TODO R: if this is group appointment -- cancel auth in other appointment

      if (isShortTimeSlot || isAdditionalTime) {
        await this.changeAppointmentStatusToCancelledBySystem(appointment.id);

        this.sendAuthorizationPaymentFailedNotification(appointment, OldEPaymentFailedReason.AUTH_FAILED_FINAL);

        throw new UnprocessableEntityException(paymentNote);
      }

      const minutesBetweenAppointmentCreationAndStarting = differenceInMinutes(
        appointment.scheduledStartTime,
        appointment.creationDate,
      );

      if (minutesBetweenAppointmentCreationAndStarting >= NUMBER_OF_MINUTES_IN_DAY) {
        const minutesBetweenNowAndAppointmentStarting = differenceInMinutes(appointment.scheduledStartTime, new Date());

        if (minutesBetweenNowAndAppointmentStarting < NUMBER_OF_MINUTES_IN_DAY + NUMBER_OF_MINUTES_IN_HALF_HOUR) {
          await this.changeAppointmentStatusToCancelledBySystem(appointment.id);

          this.sendAuthorizationPaymentFailedNotification(appointment, OldEPaymentFailedReason.AUTH_FAILED_FINAL);

          throw new UnprocessableEntityException(paymentNote);
        } else {
          this.sendAuthorizationPaymentFailedNotification(
            appointment,
            OldEPaymentFailedReason.AUTH_FAILED_MORE_THAN_24H_REPEAT,
          );

          await this.paymentsHelperService.redirectPaymentToWaitList(appointment, true);

          return OldEPayInStatus.REDIRECTED_TO_WAIT_LIST;
        }
      } else if (minutesBetweenAppointmentCreationAndStarting >= NUMBER_OF_MINUTES_IN_SIX_HOURS) {
        this.sendAuthorizationPaymentFailedNotification(
          appointment,
          OldEPaymentFailedReason.AUTH_FAILED_MORE_THAN_6H_FIRST_ATTEMPT,
        );

        await this.paymentsHelperService.redirectPaymentToWaitList(appointment, true, true);

        return OldEPayInStatus.REDIRECTED_TO_WAIT_LIST_BY_SHORT_SLOT;
      } else {
        await this.changeAppointmentStatusToCancelledBySystem(appointment.id);

        this.sendAuthorizationPaymentFailedNotification(appointment, OldEPaymentFailedReason.AUTH_FAILED_FINAL);

        throw new UnprocessableEntityException(paymentNote);
      }
    } else {
      this.sendAuthorizationPaymentSuccessNotification(appointment);

      return OldEPayInStatus.AUTHORIZATION_SUCCESS;
    }
  }

  public async capturePayment(appointment: Appointment, isSecondAttempt: boolean = false): Promise<void> {
    const payment = await findOneOrFail(
      appointment.id,
      this.paymentRepository,
      {
        where: { appointment: { id: appointment.id }, direction: OldEPaymentDirection.INCOMING },
        relations: { items: true },
        order: { items: { creationDate: ESortOrder.ASC } },
      },
      "appointment.id",
    );

    if (payment.system !== EPaymentSystem.STRIPE) {
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

    let paymentStatus: OldEPaymentStatus = OldEPaymentStatus.CAPTURED;

    let isFirstItem = true;

    for (const paymentItem of payment.items) {
      if (paymentItem.status !== OldEPaymentStatus.AUTHORIZED && !isSecondAttempt) {
        await this.paymentItemRepository.update(
          { id: paymentItem.id },
          { note: "Incorrect payment status!", status: OldEPaymentStatus.CAPTURE_FAILED },
        );
        continue;
      }

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

      if (!paymentItem.externalId && paymentItem.fullAmount > 0) {
        await this.paymentItemRepository.update(
          { id: paymentItem.id },
          { note: "Payment externalId not fill!", status: OldEPaymentStatus.CAPTURE_FAILED },
        );
        continue;
      }

      let finalPrice: number | null = null;

      if (isFirstItem) {
        isFirstItem = false;

        try {
          finalPrice = await this.recalculateFinalPrice(appointment, paymentItem);
        } catch (error) {
          this.lokiLogger.error(
            `Error in corporate capturePayment: ${(error as Error).message}, ${(error as Error).stack}`,
          );
        }

        if (finalPrice) {
          finalPrice = denormalizedAmountToNormalized(finalPrice);
        }
      }

      try {
        if (paymentItem.fullAmount > 0 && paymentItem.externalId) {
          const paymentIntent = await this.stripeService.capturePayment(paymentItem.externalId, finalPrice);

          await this.paymentItemRepository.update({ id: paymentItem.id }, { status: OldEPaymentStatus.CAPTURED });

          if (!paymentIntent.latest_charge) {
            await this.paymentItemRepository.update({ id: paymentItem.id }, { note: "Receipt download failed" });
            continue;
          }

          const stripeReceipt = await this.stripeService.getReceipt(paymentIntent.latest_charge as string);
          const key = `payments/stripe-receipts/${randomUUID()}.html`;

          await this.awsS3Service.uploadObject(key, stripeReceipt as ReadableStream, "text/html");

          await this.paymentItemRepository.update({ id: paymentItem.id }, { receipt: key });
        } else {
          await this.paymentItemRepository.update({ id: paymentItem.id }, { status: OldEPaymentStatus.CAPTURED });
        }
      } catch (error) {
        paymentStatus = OldEPaymentStatus.CAPTURE_FAILED;
        await this.paymentItemRepository.update(
          { id: paymentItem.id },
          {
            note: (error as Stripe.Response<Stripe.StripeRawError>).message ?? null,
            status: OldEPaymentStatus.CAPTURE_FAILED,
          },
        );
        continue;
      }
    }

    if (paymentStatus === OldEPaymentStatus.CAPTURED) {
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

        await this.emailsService.sendIncomingPaymentReceipt(
          appointment.client.profile.contactEmail,
          receiptLink,
          receipt.receiptData,
        );
      } catch (error) {
        this.lokiLogger.error(
          `Error in corporate capturePayment: ${(error as Error).message}, ${(error as Error).stack}`,
        );
      }
    }
  }

  public async cancelAuthorization(appointmentId: string): Promise<void> {
    const payment = await findOneOrFail(
      appointmentId,
      this.paymentRepository,
      {
        where: { appointment: { id: appointmentId }, direction: OldEPaymentDirection.INCOMING },
        relations: { items: true },
      },
      "appointment.id",
    );

    if (payment.system !== EPaymentSystem.STRIPE) {
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

      if (!paymentItem.externalId && paymentItem.fullAmount > 0) {
        await this.paymentItemRepository.update(
          { id: paymentItem.id },
          { note: "Payment externalId not fill!", status: OldEPaymentStatus.CANCEL_FAILED },
        );
        continue;
      }

      try {
        if (paymentItem.fullAmount > 0 && paymentItem.externalId) {
          await this.stripeService.cancelAuthorization(paymentItem.externalId);
        }

        await this.paymentItemRepository.update({ id: paymentItem.id }, { status: OldEPaymentStatus.CANCELED });
      } catch (error) {
        await this.paymentItemRepository.update(
          { id: paymentItem.id },
          {
            note: (error as Stripe.Response<Stripe.StripeRawError>).message ?? null,
            status: OldEPaymentStatus.CANCEL_FAILED,
          },
        );
        continue;
      }
    }
  }

  private async recalculateFinalPrice(appointment: Appointment, paymentItem: OldPaymentItem): Promise<number | null> {
    let finalPrice: number | null = null;

    if (!appointment.client) {
      throw new BadRequestException("Client not exist!");
    }

    const isCorporate: boolean = false;
    const country = appointment.client.country;

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
    }

    return finalPrice;
  }

  /*
   * Individual interpreter, pay out, stripe
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

  private async createPayoutByStripe(appointment: Appointment, isSecondAttempt: boolean): Promise<void> {
    const payment = await findOneOrFail(
      appointment.id,
      this.paymentRepository,
      {
        where: { appointment: { id: appointment.id }, direction: OldEPaymentDirection.OUTCOMING },
        relations: { items: true },
      },
      "appointment.id",
    );

    if (payment.system !== EPaymentSystem.STRIPE) {
      throw new BadRequestException("Incorrect payment system!");
    }

    if (payment.direction !== OldEPaymentDirection.OUTCOMING) {
      throw new BadRequestException("Incorrect payment direction!");
    }

    if (!appointment.interpreter) {
      throw new BadRequestException("Interpreter not exist!");
    }

    if (!appointment.interpreter.profile) {
      throw new BadRequestException("Interpreter profile not fill!");
    }

    if (!appointment.interpreter.profile.contactEmail) {
      throw new BadRequestException("Interpreter contact email not fill!");
    }

    if (!appointment.interpreter.paymentInformation) {
      throw new BadRequestException("Payment info not filled!");
    }

    if (!appointment.interpreter.paymentInformation.stripeInterpreterAccountId) {
      throw new BadRequestException("Stripe payment info not filled!");
    }

    if (
      !appointment.interpreter.paymentInformation.stripeInterpreterCardId ||
      !appointment.interpreter.paymentInformation.stripeInterpreterCardBrand ||
      !appointment.interpreter.paymentInformation.stripeInterpreterCardLast4
    ) {
      throw new BadRequestException("Stripe card payment info not filled!");
    }

    for (const paymentItem of payment.items) {
      if (paymentItem.status !== OldEPaymentStatus.TRANSFERED && !isSecondAttempt) {
        await this.paymentItemRepository.update(
          { id: paymentItem.id },
          { note: "Incorrect payment status!", status: OldEPaymentStatus.PAYOUT_FAILED },
        );
      }

      if (
        paymentItem.status !== OldEPaymentStatus.TRANSFERED &&
        paymentItem.status !== OldEPaymentStatus.PAYOUT_FAILED &&
        isSecondAttempt
      ) {
        await this.paymentItemRepository.update(
          { id: paymentItem.id },
          { note: "Incorrect payment status!", status: OldEPaymentStatus.PAYOUT_FAILED },
        );
      }
    }

    try {
      const payout = await this.stripeService.createPayout(
        payment.totalAmount,
        payment.currency,
        appointment.interpreter.paymentInformation.stripeInterpreterAccountId,
      );

      await this.paymentItemRepository.update(
        { paymentId: payment.id },
        { status: OldEPaymentStatus.PAYOUT_SUCCESS, externalId: payout.id },
      );

      // TODO: check stripe payout receipt, if exist -- save
    } catch (error) {
      await this.paymentItemRepository.update(
        { paymentId: payment.id },
        {
          note: (error as Stripe.Response<Stripe.StripeRawError>).message ?? null,
          status: OldEPaymentStatus.PAYOUT_FAILED,
        },
      );
    }
  }

  /*
   * Individual interpreter, pay out, paypal
   */

  private async createTransferByPaypal(
    fullAmount: number,
    currency: OldECurrencies,
    paypalPayerId: string | null,
    appointmentPlatformId: string,
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
        appointmentPlatformId,
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
   * General Payout
   */

  /**
   * Processes a transfer and payout for an interpreter associated with a specific appointment.
   *
   * @param {number} amount - The payment amount, denormalized (e.g., 2.25).
   * @param {number} gstAmount - The GST (Goods and Services Tax) amount for the payment, denormalized (e.g., 0.25).
   * @param appointment
   * @param isSecondAttempt
   * @param {OldECurrencies} [currency=ECurrencies.AUD] - The currency of the payment (default is AUD).
   * @returns {Promise<void>} - A promise that resolves when the transfer and payout process is completed successfully, or rejects with an exception if an error occurs.
   *
   * @example
   * await makeTransferAndPayout(2.25, 0.25, "0470e502-fe0e-497d-9ddc-79862101b5bb", ECurrencies.USD);
   */
  public async makeTransferAndPayout(
    amount: number,
    gstAmount: number,
    appointment: Appointment,
    isSecondAttempt: boolean,
    currency: OldECurrencies = OldECurrencies.AUD,
  ): Promise<void> {
    const interpreterPaymentInfo = await this.createTransfer(amount, gstAmount, appointment, isSecondAttempt, currency);

    if (
      interpreterPaymentInfo.paymentInfo.interpreterSystemForPayout === EPaymentSystem.STRIPE &&
      interpreterPaymentInfo.paymentInfo.stripeInterpreterCardId &&
      interpreterPaymentInfo.paymentInfo.stripeInterpreterCardLast4
    ) {
      await this.createPayoutByStripe(appointment, isSecondAttempt);
    }

    await this.appointmentRepository.update(
      { id: appointment.id },
      { receivedByInterpreter: amount + gstAmount, receivedByInterpreterGst: gstAmount, interpreterCurrency: currency },
    );

    const receipt = await this.pdfBuilderService.generatePayOutReceipt(interpreterPaymentInfo.payment.id);

    const receiptLink = `${this.BACK_END_URL}/v1/payments/download-receipt?receiptKey=${receipt.receiptKey}`;

    await this.emailsService.sendOutgoingPaymentReceipt(
      interpreterPaymentInfo.profile.contactEmail,
      receiptLink,
      receipt.receiptData,
    );

    let taxInvoiceReceiptKey: string | null = null;

    if (gstAmount !== 0) {
      const taxInvoice = await this.pdfBuilderService.generateTaxInvoiceReceipt(interpreterPaymentInfo.payment.id);

      taxInvoiceReceiptKey = taxInvoice.receiptKey;

      const taxInvoiceLink = `${this.BACK_END_URL}/v1/payments/download-receipt?receiptKey=${taxInvoice.receiptKey}`;

      await this.emailsService.sendTaxInvoicePaymentReceipt(
        interpreterPaymentInfo.profile.contactEmail,
        taxInvoiceLink,
        taxInvoice.receiptData,
      );
    }

    await this.paymentRepository.update(
      { id: interpreterPaymentInfo.payment.id },
      {
        receipt: receipt.receiptKey,
        taxInvoice: taxInvoiceReceiptKey,
      },
    );
  }

  /**
   * Creates a payment transfer to the interpreter associated with a specific appointment.
   *
   * @param {number} amount - The transfer amount, denormalized (e.g., 2.25).
   * @param {number} gstAmount - The GST (Goods and Services Tax) amount for the transfer, denormalized (e.g., 0.25).
   * @param {string} appointment - The appointment for which the transfer is being created.
   * @param {OldECurrencies} [currency=ECurrencies.AUD] - The currency of the transfer (default is AUD).
   * @param isSecondAttempt
   * @returns {Promise<{ paymentInfo: PaymentInformation; payment: OldPayment; profile: UserProfile }>}
   *
   * @example
   * const result = await createTransfer(2.25, 0.25, "0470e502-fe0e-497d-9ddc-79862101b5bb", ECurrencies.USD);
   */
  private async createTransfer(
    amount: number,
    gstAmount: number,
    appointment: Appointment,
    isSecondAttempt: boolean,
    currency: OldECurrencies = OldECurrencies.AUD,
  ): Promise<OldITransferReturnedInfo> {
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

    const existedOutcomingPayment = await this.paymentRepository.findOne({
      where: { appointment: { id: appointment.id }, direction: OldEPaymentDirection.OUTCOMING },
      relations: { items: true },
    });

    if (existedOutcomingPayment && !isSecondAttempt) {
      throw new BadRequestException("Outcoming Payment already exist!");
    }

    if (!appointment.interpreter) {
      throw new BadRequestException("User role not exist!");
    }

    if (!appointment.interpreter.paymentInformation) {
      throw new BadRequestException("Payment info not filled!");
    }

    if (!appointment.interpreter.paymentInformation.interpreterSystemForPayout) {
      throw new BadRequestException("Payment info not filled!");
    }

    const fullAmount = amount + gstAmount;

    let transferResult: OldICreateTransfer | null = null;

    let paymentMethodInfo: string = "";

    if (appointment.interpreter.paymentInformation.interpreterSystemForPayout === EPaymentSystem.STRIPE) {
      transferResult = await this.createTransferByStripe(
        denormalizedAmountToNormalized(fullAmount),
        currency,
        appointment.interpreter.paymentInformation.stripeInterpreterAccountId,
      );

      if (
        appointment.interpreter.paymentInformation.interpreterSystemForPayout === EPaymentSystem.STRIPE &&
        appointment.interpreter.paymentInformation.stripeInterpreterCardId &&
        appointment.interpreter.paymentInformation.stripeInterpreterCardLast4
      ) {
        paymentMethodInfo = `Credit Card ${appointment.interpreter.paymentInformation.stripeInterpreterCardLast4}`;
      } else {
        paymentMethodInfo = `Bank Account ${appointment.interpreter.paymentInformation.stripeInterpreterBankAccountLast4}`;
      }
    } else {
      transferResult = await this.createTransferByPaypal(
        fullAmount,
        currency,
        appointment.interpreter.paymentInformation.paypalPayerId,
        appointment.platformId,
      );

      paymentMethodInfo = `Paypal Account ${appointment.interpreter.paymentInformation.paypalEmail}`;
    }

    let payment: OldPayment | null = existedOutcomingPayment;

    if (!payment) {
      const newPayment = this.paymentRepository.create({
        direction: OldEPaymentDirection.OUTCOMING,
        customerType: OldECustomerType.INDIVIDUAL,
        toInterpreter: appointment.interpreter,
        appointment,
        system: appointment.interpreter.paymentInformation.interpreterSystemForPayout,
        totalAmount: amount,
        totalGstAmount: gstAmount,
        totalFullAmount: fullAmount,
        currency,
        stripeInterpreterPayoutType: OldEStripeInterpreterPayoutType.INTERNAL,
        paymentMethodInfo,
      });

      payment = await this.paymentRepository.save(newPayment);
    }

    const paymentItem = this.paymentItemRepository.create({
      payment,
      transferId: transferResult?.transferId,
      amount,
      gstAmount,
      fullAmount: amount + gstAmount,
      currency,
      status: transferResult.paymentStatus,
      note: transferResult.paymentNote,
    });

    await this.paymentItemRepository.save(paymentItem);

    if (transferResult.paymentStatus !== OldEPaymentStatus.TRANSFERED) {
      throw new UnprocessableEntityException(transferResult.paymentNote);
    }

    return {
      paymentInfo: appointment.interpreter.paymentInformation,
      payment,
      profile: appointment.interpreter.profile,
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
}
