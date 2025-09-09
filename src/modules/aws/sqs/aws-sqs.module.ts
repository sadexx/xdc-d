import { Module } from "@nestjs/common";
import { AwsSQSService, WebhookService } from "src/modules/aws/sqs/services";
import { WebhookController } from "src/modules/aws/sqs/controllers";
import { QueueModule } from "src/modules/queues/queues.module";
import { AwsConfigModule } from "src/modules/aws/config/aws-config.module";

@Module({
  imports: [AwsConfigModule, QueueModule],
  providers: [WebhookService, AwsSQSService],
  controllers: [WebhookController],
  exports: [WebhookService],
})
export class AwsSQSModule {}
