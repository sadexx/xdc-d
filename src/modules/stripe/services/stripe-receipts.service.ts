import { Injectable } from "@nestjs/common";
import { LokiLogger } from "src/common/logger";
import { AwsS3Service } from "src/modules/aws/s3/aws-s3.service";
import { TCaptureItemWithAmount } from "src/modules/payments-new/common/types";
import { IStripeOperationResult } from "src/modules/stripe/common/interfaces";
import { StripePaymentsService } from "src/modules/stripe/services";

@Injectable()
export class StripeReceiptsService {
  private readonly lokiLogger = new LokiLogger(StripeReceiptsService.name);
  constructor(
    private readonly stripePaymentsService: StripePaymentsService,
    private readonly awsS3Service: AwsS3Service,
  ) {}

  public async uploadPaymentItemReceipt(
    paymentItem: TCaptureItemWithAmount,
    stripeOperationResult: IStripeOperationResult,
  ): Promise<string | null> {
    try {
      if (!stripeOperationResult.latestCharge) {
        this.lokiLogger.error(
          `Failed to upload payment item receipt, missing latest charge, paymentItemId: ${paymentItem.id}`,
        );

        return null;
      }

      const key = `payments/stripe-receipts/${paymentItem.id}.html`;

      const stripeReceipt = await this.stripePaymentsService.getReceipt(stripeOperationResult.latestCharge);
      await this.awsS3Service.uploadObject(key, stripeReceipt as ReadableStream, "text/html");

      return key;
    } catch (error) {
      this.lokiLogger.error(
        `Failed to upload payment item receipt, paymentItemId: ${paymentItem.id}`,
        (error as Error).stack,
      );

      return null;
    }
  }
}
