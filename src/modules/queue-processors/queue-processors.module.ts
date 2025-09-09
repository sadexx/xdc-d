import { Module, OnModuleInit } from "@nestjs/common";
import { QueueProcessorService } from "src/modules/queue-processors/services";
import { MembershipsModule } from "src/modules/memberships/memberships.module";
import { StripeModule } from "src/modules/stripe/stripe.module";
import { QueueProcessorBridgeModule } from "src/modules/queue-processor-bridge/queue-processor-bridge.module";
import { ModuleRef } from "@nestjs/core";
import { QueueProcessorBridgeService } from "src/modules/queue-processor-bridge/services";
import { WebhookProcessorModule } from "src/modules/webhook-processor/webhook-processor.module";
import { ChimeMeetingConfigurationModule } from "src/modules/chime-meeting-configuration/chime-meeting-configuration.module";
import { AppointmentsModule } from "src/modules/appointments/appointment/appointments.module";

@Module({
  imports: [
    QueueProcessorBridgeModule,
    MembershipsModule,
    StripeModule,
    WebhookProcessorModule,
    ChimeMeetingConfigurationModule,
    AppointmentsModule,
  ],
  providers: [QueueProcessorService],
  exports: [],
})
export class QueueProcessorsModule implements OnModuleInit {
  constructor(
    private moduleRef: ModuleRef,
    private bridgeService: QueueProcessorBridgeService,
  ) {}

  onModuleInit(): void {
    const queueProcessor = this.moduleRef.get(QueueProcessorService);
    this.bridgeService.registerProcessor(queueProcessor);
  }
}
