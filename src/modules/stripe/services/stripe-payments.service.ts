import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LokiLogger } from "src/common/logger";
import { StripeSdkService } from "src/modules/stripe/services";
import Stripe from "stripe";
import { NUMBER_OF_MILLISECONDS_IN_TEN_SECONDS } from "src/common/constants";
import {
  IAuthorizePaymentData,
  IAuthorizePayment,
  IChargeByBECSDebitData,
  IChargeByBECSDebit,
} from "src/modules/stripe/common/interfaces";
import { AwsS3Service } from "src/modules/aws/s3/aws-s3.service";

@Injectable()
export class StripePaymentsService {
  private readonly lokiLogger = new LokiLogger(StripePaymentsService.name);

  private readonly BACK_END_URL: string;
  constructor(
    private readonly configService: ConfigService,
    private readonly stripeSdkService: StripeSdkService,
    private readonly awsS3Service: AwsS3Service,
  ) {
    this.BACK_END_URL = this.configService.getOrThrow<string>("appUrl");
  }

  /**
   * Retrieves a payment intent by its ID.
   * @param paymentIntentId - The Stripe payment intent ID.
   * @returns {Promise<Stripe.Response<Stripe.PaymentIntent>>}
   */
  public async getPaymentIntent(paymentIntentId: string): Promise<Stripe.Response<Stripe.PaymentIntent>> {
    const paymentIntent = await this.stripeSdkService.retrievePaymentIntent(paymentIntentId);

    return paymentIntent;
  }

  /**
   * Downloads a receipt for a charge as a readable stream.
   * Fetches from Stripe's receipt URL with a 10-second timeout.
   * @param latestCharge - The Stripe charge ID.
   * @returns {Promise<ReadableStream<Uint8Array>>}
   * @throws {BadRequestException} If receipt URL is not available.
   * @throws {ServiceUnavailableException} If fetch fails.
   */
  public async getReceipt(latestCharge: string): Promise<ReadableStream<Uint8Array>> {
    const charge = await this.stripeSdkService.retrieveCharge(latestCharge);

    if (!charge.receipt_url) {
      this.lokiLogger.error(`Receipt URL not found for charge: ${latestCharge}`);
      throw new BadRequestException("Failed to download receipt.");
    }

    try {
      const receiptResponse = await fetch(charge.receipt_url, {
        signal: AbortSignal.timeout(NUMBER_OF_MILLISECONDS_IN_TEN_SECONDS),
      });

      if (!receiptResponse.ok || !receiptResponse.body) {
        this.lokiLogger.error(`Failed to download receipt: ${receiptResponse.statusText}`);
        throw new ServiceUnavailableException("Failed to fetch receipt data from external service.");
      }

      return receiptResponse.body as ReadableStream<Uint8Array>;
    } catch (error) {
      this.lokiLogger.error(`Error during receipt download: ${(error as Error).message}`);
      throw new ServiceUnavailableException("External service request failed during receipt download.");
    }
  }

  /**
   * Authorizes a payment by creating and confirming a payment intent with manual capture.
   * Used for placing holds on funds for appointments.
   * @param data - The authorization data including amount, currency, payment method, customer, idempotency key, and appointment ID.
   * @returns {Promise<IAuthorizePayment>}
   */
  //TODO: idempotencyKey not optional
  public async authorizePayment(data: IAuthorizePaymentData): Promise<IAuthorizePayment> {
    const { amount, currency, paymentMethodId, customerId, idempotencyKey, appointmentPlatformId } = data;
    const constructedReturnUrl = `${this.BACK_END_URL}/v1/stripe/add-payment-method`;

    const paymentIntent = await this.stripeSdkService.createPaymentIntent(
      {
        amount,
        currency,
        customer: customerId,
        payment_method: paymentMethodId,
        capture_method: "manual",
        confirm: true,
        return_url: constructedReturnUrl,
        description: `For appointment ${appointmentPlatformId}`,
      },
      { idempotencyKey },
    );

    return { paymentIntentId: paymentIntent.id };
  }

  /**
   * Captures (finalizes) a previously authorized Payment Intent.
   * If `amountToCapture` is provided, a partial capture is performed.
   * If `amountToCapture` is undefined, the full authorized amount is captured.
   *
   * @param paymentIntentId - The ID of the Payment Intent to capture.
   * @param idempotencyKey -  The idempotency key for the capture operation.
   * @param amountToCapture - The amount (in smallest currency unit, e.g., cents) to capture.
   * @returns {Promise<Stripe.Response<Stripe.PaymentIntent>>}
   */
  public async capturePayment(
    paymentIntentId: string,
    idempotencyKey: string,
    amountToCapture: number,
  ): Promise<Stripe.Response<Stripe.PaymentIntent>> {
    const paymentIntent = await this.stripeSdkService.capturePaymentIntent(
      paymentIntentId,
      { amount_to_capture: amountToCapture },
      { idempotencyKey },
    );

    return paymentIntent;
  }

  /**
   * Charges a customer using AU BECS debit payment method.
   * Creates and confirms a payment intent for deposits on company accounts.
   * @param data - The charge data including amount, currency, payment method, customer, idempotency key, and company ID.
   * @returns {Promise<IChargeByBECSDebit>}
   */
  public async chargeByBECSDebit(data: IChargeByBECSDebitData): Promise<IChargeByBECSDebit> {
    const { amount, currency, paymentMethodId, customerId, idempotencyKey, companyPlatformId } = data;

    const paymentIntent = await this.stripeSdkService.createPaymentIntent(
      {
        amount,
        currency,
        customer: customerId,
        payment_method: paymentMethodId,
        payment_method_types: ["au_becs_debit"],
        confirm: true,
        description: `Deposit charge for company ${companyPlatformId}`,
      },
      { idempotencyKey },
    );

    return { paymentIntentId: paymentIntent.id };
  }

  /**
   * Cancels a payment intent authorization.
   * Releases any held funds.
   * @param paymentIntentId - The Stripe payment intent ID to cancel.
   * @param idempotencyKey -  The idempotency key for the cancel operation.
   * @returns {Promise<void>}
   */
  public async cancelAuthorization(paymentIntentId: string, idempotencyKey: string): Promise<void> {
    await this.stripeSdkService.cancelPaymentIntent(paymentIntentId, { idempotencyKey });
  }

  /**
   * Retrieves the Stripe payment receipt for a given payment item, downloads it from Stripe,
   * uploads it to AWS S3 as an HTML file, and returns the S3 object key.
   * If the `latestCharge` is not provided, logs an error and returns `null`.
   * On any other failure (e.g., download or upload error), logs the error and returns `null`.
   *
   * @param {string} paymentItemId - The unique identifier for the payment item.
   * @param {string} [latestCharge] - The Stripe charge ID associated with the latest charge for this payment.
   * @returns {Promise<string | null>} A promise that resolves to the S3 object key (e.g., 'payments/stripe-receipts/{paymentItemId}.html')
   *   if the receipt is successfully uploaded, or `null` if the operation fails.
   */
  public async getPaymentReceipt(paymentItemId: string, latestCharge?: string): Promise<string | null> {
    try {
      if (!latestCharge) {
        this.lokiLogger.error(
          `Failed to get payment receipt, missing latestCharge for paymentItemId: ${paymentItemId}`,
        );

        return null;
      }

      const key = `payments/stripe-receipts/${paymentItemId}.html`;
      const stripeReceipt = await this.getReceipt(latestCharge);
      await this.awsS3Service.uploadObject(key, stripeReceipt as ReadableStream, "text/html");

      return key;
    } catch (error) {
      this.lokiLogger.error(
        `Failed to get payment receipt for paymentItemId: ${paymentItemId}`,
        (error as Error).stack,
      );

      return null;
    }
  }
}
