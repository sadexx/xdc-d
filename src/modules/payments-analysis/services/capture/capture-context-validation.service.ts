import { Injectable } from "@nestjs/common";
import { ICapturePaymentContext } from "src/modules/payments-analysis/common/interfaces/capture";
import { EPaymentDirection, EPaymentSystem } from "src/modules/payments/common/enums/core";
import { IPaymentValidationResult } from "src/modules/payments/common/interfaces/payment-failed";

@Injectable()
export class CaptureContextValidationService {
  /**
   * Validates the capture context based on corporate status.
   *
   * Performs validation appropriate to the capture type:
   * - Same company commission: validates commission amounts and payment records
   * - Corporate capture: validates deposit information and payment status
   * - Individual capture: validates Stripe payment information and status
   *
   * @param context - The capture payment context to validate
   * @returns Validation result indicating success or failure with error messages
   */
  public validateCaptureContext(context: ICapturePaymentContext): IPaymentValidationResult {
    const { isSameCorporateCompany, isClientCorporate } = context;

    if (isSameCorporateCompany) {
      return this.validateSameCompanyCommissionCaptureContext(context);
    }

    if (isClientCorporate) {
      return this.validateCorporateCaptureContext(context);
    } else {
      return this.validateIndividualCaptureContext(context);
    }
  }

  private validateSameCompanyCommissionCaptureContext(context: ICapturePaymentContext): IPaymentValidationResult {
    const errors: string[] = [];
    const { payment, commissionAmounts } = context;
    const missingFields = [payment.company, commissionAmounts].filter((value) => !value);

    if (missingFields.length > 0) {
      errors.push("Invalid context state for same company commission.");
    }

    if (payment.company) {
      if (!payment.company.platformCommissionRate) {
        errors.push("Commission rate is not set.");
      }
    }

    return this.buildValidationResult([]);
  }

  private validateCorporateCaptureContext(context: ICapturePaymentContext): IPaymentValidationResult {
    const errors: string[] = [];
    const { payment } = context;

    if (!payment.company) {
      errors.push("Invalid context state for corporate capture.");
    }

    if (payment.system !== EPaymentSystem.DEPOSIT && payment.system !== EPaymentSystem.POST_PAYMENT) {
      errors.push("Incorrect payment system.");
    }

    if (payment.direction !== EPaymentDirection.INCOMING) {
      errors.push("Incorrect payment direction.");
    }

    return this.buildValidationResult(errors);
  }

  private validateIndividualCaptureContext(context: ICapturePaymentContext): IPaymentValidationResult {
    const errors: string[] = [];
    const { payment } = context;

    if (payment.system !== EPaymentSystem.STRIPE) {
      errors.push("Incorrect payment system.");
    }

    if (payment.direction !== EPaymentDirection.INCOMING) {
      errors.push("Incorrect payment direction.");
    }

    return this.buildValidationResult(errors);
  }

  private buildValidationResult(errors: string[]): IPaymentValidationResult {
    return {
      success: errors.length === 0,
      errors,
    };
  }
}
