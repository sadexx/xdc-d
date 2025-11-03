import { Injectable } from "@nestjs/common";
import { ICapturePaymentContext } from "src/modules/payment-analysis/common/interfaces/capture";
import { IPaymentValidationResult } from "src/modules/payments-new/common/interfaces";
import { EPaymentDirection, EPaymentSystem } from "src/modules/payments-new/common/enums";

@Injectable()
export class CaptureContextValidationService {
  public validateCaptureContext(context: ICapturePaymentContext): IPaymentValidationResult {
    const { corporateContext } = context;

    if (corporateContext.isSameCorporateCompany) {
      return this.validateSameCompanyCommissionCaptureContext(context);
    }

    if (corporateContext.isClientCorporate) {
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

    if (payment.system !== EPaymentSystem.DEPOSIT) {
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
