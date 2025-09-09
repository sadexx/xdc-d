import { Module } from "@nestjs/common";
import { QueueProcessorBridgeService } from "src/modules/queue-processor-bridge/services";

@Module({
  providers: [QueueProcessorBridgeService],
  exports: [QueueProcessorBridgeService],
})
export class QueueProcessorBridgeModule {}
