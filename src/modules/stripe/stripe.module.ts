import { Module } from "@nestjs/common";
import {
  StripeConnectService,
  StripeCustomersService,
  StripePaymentsService,
  StripeReceiptsService,
  StripeSdkService,
  StripeSubscriptionsService,
} from "src/modules/stripe/services";
import { QueueModule } from "src/modules/queues/queues.module";
import { AwsS3Module } from "src/modules/aws/s3/aws-s3.module";

@Module({
  imports: [QueueModule, AwsS3Module],
  providers: [
    StripeSdkService,
    StripeConnectService,
    StripeCustomersService,
    StripePaymentsService,
    StripeSubscriptionsService,
    StripeReceiptsService,
  ],
  exports: [
    StripeSdkService,
    StripeConnectService,
    StripeCustomersService,
    StripePaymentsService,
    StripeSubscriptionsService,
    StripeReceiptsService,
  ],
})
export class StripeModule {}
