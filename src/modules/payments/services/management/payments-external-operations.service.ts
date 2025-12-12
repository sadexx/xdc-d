import { Injectable } from "@nestjs/common";
import { StripeConnectService, StripePaymentsService } from "src/modules/stripe/services";
import {
  TPaymentItemAuthorizationCancelContext,
  TLoadAppointmentAuthorizationCancelContext,
} from "src/modules/payments-analysis/common/types/authorization-cancel";
import { EPaymentCurrency, EPaymentStatus } from "src/modules/payments/common/enums/core";
import { denormalizedAmountToNormalized, formatDecimalString } from "src/common/utils";
import { UNDEFINED_VALUE } from "src/common/constants";
import { PaypalSdkService } from "src/modules/paypal/services";
import {
  TChargeCompaniesDeposit,
  TChargeCompaniesDepositValidatedCompany,
} from "src/modules/companies-deposit-charge/common/types";
import { TPaymentItemCaptureContextItem } from "src/modules/payments-analysis/common/types/capture";
import { ICancelAuthorizationContext } from "src/modules/payments/common/interfaces/authorization";
import { IPaymentExternalOperationResult } from "src/modules/payments/common/interfaces/management";
import { TAuthorizePaymentContext } from "src/modules/payments/common/types/authorization";

@Injectable()
export class PaymentsExternalOperationsService {
  constructor(
    private readonly stripePaymentsService: StripePaymentsService,
    private readonly stripeConnectService: StripeConnectService,
    private readonly paypalSdkService: PaypalSdkService,
  ) {}

  /**
   * Attempts to authorize a payment via Stripe.
   *
   * Creates a payment intent in Stripe to authorize the specified amount using the client's
   * payment method. Uses idempotency key to prevent duplicate authorizations.
   *
   * @param context - Authorization context with pricing, currency, and client payment details
   * @returns Operation result with status (AUTHORIZED or AUTHORIZATION_FAILED) and payment intent ID
   */
  public async attemptStripeAuthorization(context: TAuthorizePaymentContext): Promise<IPaymentExternalOperationResult> {
    const { prices, currency, appointment } = context;
    const idempotencyKey = this.generateAuthorizationIdempotencyKey(context);
    const normalizedAmount = denormalizedAmountToNormalized(prices.clientFullAmount);
    try {
      const { paymentIntentId } = await this.stripePaymentsService.authorizePayment({
        amount: normalizedAmount,
        currency,
        paymentMethodId: appointment.client.paymentInformation.stripeClientPaymentMethodId,
        customerId: appointment.client.paymentInformation.stripeClientAccountId,
        appointmentPlatformId: appointment.platformId,
        idempotencyKey,
      });

      return {
        status: EPaymentStatus.AUTHORIZED,
        paymentIntentId: paymentIntentId,
      };
    } catch (error) {
      return {
        status: EPaymentStatus.AUTHORIZATION_FAILED,
        error: (error as Error).message,
      };
    }
  }

  private generateAuthorizationIdempotencyKey(context: TAuthorizePaymentContext): string {
    const { appointment, additionalBlockDuration } = context;

    if (additionalBlockDuration) {
      return `authorization:additional-time:${appointment.id}-${appointment.client.id}-${appointment.businessEndTime ?? appointment.internalEstimatedEndTime}`;
    }

    return `authorization:${appointment.id}-${appointment.client.id}`;
  }

  /**
   * Attempts to cancel a Stripe payment authorization.
   *
   * Cancels the payment intent in Stripe using the external ID from the payment item.
   * Returns cancelled status on success or cancel failed status with error message on failure.
   *
   * @param context - Cancellation context containing appointment data
   * @param paymentItem - Payment item with Stripe external ID to cancel
   * @returns Operation result with status (CANCELED or CANCEL_FAILED)
   */
  public async attemptStripeAuthorizationCancel(
    context: ICancelAuthorizationContext,
    paymentItem: TPaymentItemAuthorizationCancelContext,
  ): Promise<IPaymentExternalOperationResult> {
    const { appointment } = context;
    const idempotencyKey = this.generateAuthorizationCancelIdempotencyKey(appointment);
    try {
      await this.stripePaymentsService.cancelAuthorization(paymentItem.externalId, idempotencyKey);

      return { status: EPaymentStatus.CANCELED };
    } catch (error) {
      return { status: EPaymentStatus.CANCEL_FAILED, error: (error as Error).message };
    }
  }

  private generateAuthorizationCancelIdempotencyKey(appointment: TLoadAppointmentAuthorizationCancelContext): string {
    return `authorization-cancel:${appointment.id}-${appointment.client.id}`;
  }

  /**
   * Attempts to charge a corporate deposit via Stripe BECS debit.
   *
   * Initiates a BECS direct debit payment from the company's bank account to recharge
   * their deposit balance. Payment intent status will be updated via webhook when processing completes.
   *
   * @param depositCharge - Deposit charge record to process
   * @param company - Company with validated payment information
   * @param currency - Currency for the charge
   * @param totalFullAmount - Amount to charge including GST
   * @returns Operation result with status (DEPOSIT_PAYMENT_REQUEST_INITIALIZING or AUTHORIZATION_FAILED)
   */
  public async attemptStripeDepositCharge(
    depositCharge: TChargeCompaniesDeposit,
    company: TChargeCompaniesDepositValidatedCompany,
    currency: EPaymentCurrency,
    totalFullAmount: number,
  ): Promise<IPaymentExternalOperationResult> {
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
    return `deposit-charge:${depositCharge.company.id}-${depositCharge.id}`;
  }

  /**
   * Attempts to capture an authorized Stripe payment.
   *
   * Captures the specified amount from a previously authorized payment intent.
   * Returns immediately as captured if amount is zero or no external ID exists.
   *
   * @param paymentItem - Payment item with Stripe external ID
   * @param amountToCapture - Amount to capture (may differ from original authorization)
   * @returns Operation result with status (CAPTURED or CAPTURE_FAILED), payment intent ID, and charge ID
   */
  public async attemptStripeCapture(
    paymentItem: TPaymentItemCaptureContextItem,
    amountToCapture: number,
  ): Promise<IPaymentExternalOperationResult> {
    if (amountToCapture <= 0 || !paymentItem.externalId) {
      return { status: EPaymentStatus.CAPTURED };
    }

    const idempotencyKey = this.generateCaptureIdempotencyKey(paymentItem);
    const normalizedAmount = denormalizedAmountToNormalized(amountToCapture);
    try {
      const paymentIntent = await this.stripePaymentsService.capturePayment(
        paymentItem.externalId,
        idempotencyKey,
        normalizedAmount,
      );

      return {
        status: EPaymentStatus.CAPTURED,
        paymentIntentId: paymentIntent.id,
        latestCharge: (paymentIntent.latest_charge as string) ?? UNDEFINED_VALUE,
      };
    } catch (error) {
      return { status: EPaymentStatus.CAPTURE_FAILED, error: (error as Error).message };
    }
  }

  private generateCaptureIdempotencyKey(paymentItem: TPaymentItemCaptureContextItem): string {
    return `capture:${paymentItem.id}-${paymentItem.externalId}`;
  }

  /**
   * Attempts to transfer funds to an interpreter via Stripe Connect.
   *
   * Creates a transfer from the platform's Stripe account to the interpreter's
   * connected Stripe account. Used for immediate payouts to individual interpreters.
   *
   * @param fullAmount - Total amount to transfer including GST
   * @param currency - Currency for the transfer
   * @param stripeAccountId - Interpreter's connected Stripe account ID
   * @param uniqueIdentifier - Unique identifier for idempotency (e.g., payment item ID)
   * @returns Operation result with status (TRANSFERED or TRANSFER_FAILED) and transfer ID
   */
  public async attemptStripeTransfer(
    fullAmount: number,
    currency: EPaymentCurrency,
    stripeAccountId: string,
    uniqueIdentifier: string,
  ): Promise<IPaymentExternalOperationResult> {
    const idempotencyKey = this.generateTransferIdempotencyKey(stripeAccountId, uniqueIdentifier);
    const normalizedAmount = denormalizedAmountToNormalized(fullAmount);
    try {
      const { transferId } = await this.stripeConnectService.createTransfer(
        normalizedAmount,
        currency,
        stripeAccountId,
        idempotencyKey,
      );

      return {
        status: EPaymentStatus.TRANSFERED,
        transferId,
      };
    } catch (error) {
      return {
        status: EPaymentStatus.TRANSFER_FAILED,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Attempts to transfer funds to an interpreter via PayPal.
   *
   * Creates a PayPal payout batch to transfer funds to the interpreter's PayPal account.
   * Used for interpreters who use PayPal as their payout method.
   *
   * @param fullAmount - Total amount to transfer
   * @param currency - Currency for the transfer
   * @param paypalPayerId - Interpreter's PayPal payer ID
   * @param platformId - Platform identifier for the payout
   * @param uniqueIdentifier - Unique identifier for idempotency
   * @param isCorporate - Whether this is a corporate interpreter
   * @returns Operation result with status (TRANSFERED or TRANSFER_FAILED) and batch ID
   */
  public async attemptPaypalTransfer(
    fullAmount: number,
    currency: EPaymentCurrency,
    paypalPayerId: string,
    platformId: string,
    uniqueIdentifier: string,
    isCorporate: boolean,
  ): Promise<IPaymentExternalOperationResult> {
    const idempotencyKey = this.generateTransferIdempotencyKey(paypalPayerId, uniqueIdentifier);
    try {
      const transfer = await this.paypalSdkService.makeTransfer({
        payerId: paypalPayerId,
        fullAmount: formatDecimalString(fullAmount),
        platformId,
        currency,
        idempotencyKey,
        isCorporate,
      });

      return {
        status: EPaymentStatus.TRANSFERED,
        transferId: transfer?.batch_header?.payout_batch_id,
      };
    } catch (error) {
      return {
        status: EPaymentStatus.TRANSFER_FAILED,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Attempts to create a Stripe payout to a connected account.
   *
   * Initiates a payout from the connected account's balance to their bank account.
   * Used for corporate interpreter payouts that are processed in batches.
   *
   * @param totalAmount - Total amount to payout
   * @param currency - Currency for the payout
   * @param stripeAccountId - Connected Stripe account ID
   * @param uniqueIdentifier - Unique identifier for idempotency
   * @returns Operation result with status (PAYOUT_SUCCESS or PAYOUT_FAILED) and payout ID
   */
  public async attemptStripePayout(
    totalAmount: number,
    currency: EPaymentCurrency,
    stripeAccountId: string,
    uniqueIdentifier: string,
  ): Promise<IPaymentExternalOperationResult> {
    const idempotencyKey = this.generateTransferIdempotencyKey(stripeAccountId, uniqueIdentifier);
    try {
      const { payoutId } = await this.stripeConnectService.createPayout(
        totalAmount,
        currency,
        stripeAccountId,
        idempotencyKey,
      );

      return {
        status: EPaymentStatus.PAYOUT_SUCCESS,
        payoutId,
      };
    } catch (error) {
      return {
        status: EPaymentStatus.PAYOUT_FAILED,
        error: (error as Error).message,
      };
    }
  }

  private generateTransferIdempotencyKey(paymentAccountId: string, uniqueIdentifier: string): string {
    return `transfer:${paymentAccountId}-${uniqueIdentifier}`;
  }
}
