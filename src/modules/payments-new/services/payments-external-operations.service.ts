import { Injectable } from "@nestjs/common";
import { StripeConnectService, StripePaymentsService } from "src/modules/stripe/services";
import { IAuthorizationCancelPaymentContext } from "src/modules/payment-analysis/common/interfaces/authorization-cancel";
import {
  TPaymentItemAuthorizationCancelContext,
  TLoadAppointmentAuthorizationCancelContext,
} from "src/modules/payment-analysis/common/types/authorization-cancel";
import { EPaymentCurrency, EPaymentStatus } from "src/modules/payments-new/common/enums";
import { denormalizedAmountToNormalized } from "src/common/utils";
import { TLoadAppointmentAuthorizationContext } from "src/modules/payment-analysis/common/types/authorization";
import { TAttemptStripeAuthorization, TCaptureItemWithAmount } from "src/modules/payments-new/common/types";
import { UNDEFINED_VALUE } from "src/common/constants";
import { PaypalSdkService } from "src/modules/paypal/services";
import { IPaymentExternalOperationResult } from "src/modules/payments-new/common/interfaces";
import {
  TChargeCompaniesDeposit,
  TChargeCompaniesDepositValidatedCompany,
} from "src/modules/companies-deposit-charge/common/types";

@Injectable()
export class PaymentsExternalOperationsService {
  constructor(
    private readonly stripePaymentsService: StripePaymentsService,
    private readonly stripeConnectService: StripeConnectService,
    private readonly paypalSdkService: PaypalSdkService,
  ) {}

  public async attemptStripeAuthorizationCancel(
    context: IAuthorizationCancelPaymentContext,
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
    return `authorization-cancel-${appointment.id}-${appointment.client.id}`;
  }

  public async attemptStripeAuthorization(
    context: TAttemptStripeAuthorization,
  ): Promise<IPaymentExternalOperationResult> {
    const { prices, currency, appointment } = context;
    const idempotencyKey = this.generateAuthorizationIdempotencyKey(context.appointment);
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

  private generateAuthorizationIdempotencyKey(appointment: TLoadAppointmentAuthorizationContext): string {
    return `authorization-${appointment.id}-${appointment.client.id}`;
  }

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
    return `deposit-charge-${depositCharge.company.id}-${depositCharge.id}`;
  }

  public async attemptStripeCapture(
    paymentItem: TCaptureItemWithAmount,
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

  private generateCaptureIdempotencyKey(paymentItem: TCaptureItemWithAmount): string {
    return `capture-${paymentItem.id}-${paymentItem.externalId}`;
  }

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
        fullAmount: String(fullAmount),
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
    return `transfer-${paymentAccountId}-${uniqueIdentifier}`;
  }
}
