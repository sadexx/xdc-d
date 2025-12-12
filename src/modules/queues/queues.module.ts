import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IRedisConnectionData } from "src/modules/redis/common/interfaces";
import { QueueInitializeService, QueueManagementService, WorkerManagementService } from "src/modules/queues/services";
import { BULLMQ_CONNECTION } from "src/modules/queues/common/constants";
import { QueueProcessorBridgeModule } from "src/modules/queue-processor-bridge/queue-processor-bridge.module";

@Module({
  imports: [QueueProcessorBridgeModule],
  providers: [
    {
      provide: BULLMQ_CONNECTION,
      useFactory: async (configService: ConfigService): Promise<{ host: string; port: number }> => {
        const redisEnvs = configService.getOrThrow<IRedisConnectionData>("redis");

        return {
          host: redisEnvs.host,
          port: redisEnvs.port,
        };
      },
      inject: [ConfigService],
    },
    QueueInitializeService,
    QueueManagementService,
    WorkerManagementService,
  ],
  exports: [QueueInitializeService, QueueManagementService],
})
export class QueueModule {}
