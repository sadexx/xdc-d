import { Module } from "@nestjs/common";
import { StripeService } from "src/modules/stripe/services";
import { QueueModule } from "src/modules/queues/queues.module";

@Module({
  imports: [QueueModule],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}
