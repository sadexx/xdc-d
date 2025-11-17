import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PaymentInformation } from "src/modules/payment-information/entities";
import { ActivationTrackingModule } from "src/modules/activation-tracking/activation-tracking.module";
import { MembershipsModule } from "src/modules/memberships/memberships.module";
import { QueueModule } from "src/modules/queues/queues.module";
import { NotificationModule } from "src/modules/notifications/notification.module";
import { Payment, PaymentItem } from "src/modules/payments/entities";
import { AwsS3Module } from "src/modules/aws/s3/aws-s3.module";
import { Company } from "src/modules/companies/entities";
import {
  WebhookDocusignService,
  WebhookStripeService,
  WebhookSumSubService,
} from "src/modules/webhook-processor/services";
import { DocusignContract } from "src/modules/docusign/entities";
import { DocusignModule } from "src/modules/docusign/docusign.module";
import { FileManagementModule } from "src/modules/file-management/file-management.module";
import { SumSubCheck } from "src/modules/sumsub/entities";
import { UserRole } from "src/modules/users/entities";
import { SumSubModule } from "src/modules/sumsub/sumsub.module";
import { MockModule } from "src/modules/mock/mock.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentInformation,
      Payment,
      PaymentItem,
      Company,
      DocusignContract,
      SumSubCheck,
      UserRole,
    ]),
    ActivationTrackingModule,
    MembershipsModule,
    QueueModule,
    NotificationModule,
    AwsS3Module,
    DocusignModule,
    FileManagementModule,
    SumSubModule,
    MockModule,
  ],
  providers: [WebhookStripeService, WebhookDocusignService, WebhookSumSubService],
  exports: [WebhookStripeService, WebhookDocusignService, WebhookSumSubService],
})
export class WebhookProcessorModule {}
