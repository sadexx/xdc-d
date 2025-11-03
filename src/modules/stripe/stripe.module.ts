import { Module } from "@nestjs/common";
import {
  StripeConnectService,
  StripeCustomersService,
  StripePaymentsService,
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
  ],
  exports: [
    StripeSdkService,
    StripeConnectService,
    StripeCustomersService,
    StripePaymentsService,
    StripeSubscriptionsService,
  ],
})
export class StripeModule {}
