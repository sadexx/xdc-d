import { Injectable, Inject, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { Worker, Job, ConnectionOptions, MetricsTime, WorkerOptions } from "bullmq";
import { NUMBER_OF_MILLISECONDS_IN_SECOND } from "src/common/constants";
import { LokiLogger } from "src/common/logger";
import { QueueProcessorBridgeService } from "src/modules/queue-processor-bridge/services";
import { BULLMQ_CONNECTION } from "src/modules/queues/common/constants";
import { EQueueType, EWorkerType } from "src/modules/queues/common/enums";
import { IQueueJobType, IWorkerSettings } from "src/modules/queues/common/interfaces";

/**
 * Service responsible for managing BullMQ workers throughout the application lifecycle.
 *
 * This service creates and configures worker instances for each queue type, handles
 * job processing delegation through the {@link QueueProcessorBridgeService}, and
 * manages worker lifecycle including error handling and graceful shutdown.
 *
 * Workers are configured with queue-specific settings such as concurrency limits,
 * rate limiting, and timeout configurations to optimize performance for different
 * job types.
 *
 * @see {@link QueueManagementService} - Companion service that manages the queues these workers process
 * @see {@link EQueueType} - Enum defining available queue types
 */
@Injectable()
export class WorkerManagementService implements OnModuleInit, OnModuleDestroy {
  private workersMap = new Map<EQueueType, Worker>();
  private readonly lokiLogger = new LokiLogger(WorkerManagementService.name);

  constructor(
    @Inject(BULLMQ_CONNECTION) private readonly connection: ConnectionOptions,
    private readonly queueProcessorBridgeService: QueueProcessorBridgeService,
  ) {}

  /**
   * Initializes all workers when the module starts.
   *
   * This lifecycle method creates a worker instance for each queue type defined in
   * {@link EQueueType}. Each worker is configured with settings from {@link getWorkerSettings}
   * and uses {@link QueueProcessorBridgeService.processJob} as its job processing function.
   *
   * Workers are also configured with error event handlers to log job failures for
   * debugging and monitoring purposes.
   *
   */
  public async onModuleInit(): Promise<void> {
    for (const queueEnum of Object.values(EQueueType)) {
      const { queueName, workerOptions } = await this.getWorkerSettings(queueEnum);
      this.lokiLogger.debug(`Initializing Worker for queue [${queueEnum}] with name "${queueName}"`);

      const worker = new Worker(
        queueName,
        async (job: Job<IQueueJobType>) => {
          return await this.queueProcessorBridgeService.processJob(queueEnum, job);
        },
        {
          connection: this.connection,
          ...workerOptions,
        },
      );

      worker.on("failed", (job, err) => {
        this.lokiLogger.error(`Job #${job?.id} on [${queueEnum}] failed: ${err.message}`);
      });

      this.lokiLogger.debug(`Worker initialized for queue [${queueEnum}]`);
      this.workersMap.set(queueEnum, worker);
    }
  }

  /**
   * Cleans up all worker resources when the module is destroyed.
   *
   * This lifecycle method properly closes all worker instances to ensure graceful
   * shutdown and prevent memory leaks. It iterates through all stored worker
   * instances and calls their close method, which stops processing new jobs
   * and waits for current jobs to complete.
   *
   */
  public async onModuleDestroy(): Promise<void> {
    for (const [queueEnum, worker] of this.workersMap.entries()) {
      this.lokiLogger.debug(`Closing worker for queue [${queueEnum}]`);
      await worker.close();
    }
  }

  /**
   * Retrieves worker-specific settings including name and configuration options.
   *
   * This private method returns customized settings for each worker type, including
   * concurrency limits, timeout configurations, rate limiting, and metrics collection.
   * The default configuration provides conservative settings that can be overridden
   * for specific queue types to optimize performance.
   *
   * @param queueEnum - The queue type to get worker settings for
   *
   */
  private async getWorkerSettings(queueEnum: EQueueType): Promise<IWorkerSettings> {
    const DEFAULT_WORKER_OPTIONS: Omit<WorkerOptions, "connection" | "name"> = {
      concurrency: 1,
      lockDuration: 40000,
      stalledInterval: 30000,
      drainDelay: 5000,
      metrics: {
        maxDataPoints: MetricsTime.TWO_WEEKS,
      },
      limiter: {
        max: 1,
        duration: NUMBER_OF_MILLISECONDS_IN_SECOND,
      },
    };

    switch (queueEnum) {
      case EQueueType.PAYMENTS_QUEUE:
        return {
          queueName: EQueueType.PAYMENTS_QUEUE,
          workerOptions: {
            name: EWorkerType.PAYMENTS,
            ...DEFAULT_WORKER_OPTIONS,
          },
        };

      case EQueueType.NOTIFICATIONS_QUEUE:
        return {
          queueName: EQueueType.NOTIFICATIONS_QUEUE,
          workerOptions: {
            name: EWorkerType.NOTIFICATIONS,
            ...DEFAULT_WORKER_OPTIONS,
            concurrency: 3,
            limiter: {
              max: 3,
              duration: NUMBER_OF_MILLISECONDS_IN_SECOND,
            },
          },
        };

      case EQueueType.WEBHOOKS_QUEUE:
        return {
          queueName: EQueueType.WEBHOOKS_QUEUE,
          workerOptions: {
            name: EWorkerType.WEBHOOKS,
            ...DEFAULT_WORKER_OPTIONS,
          },
        };

      case EQueueType.APPOINTMENTS_QUEUE:
        return {
          queueName: EQueueType.APPOINTMENTS_QUEUE,
          workerOptions: {
            name: EWorkerType.APPOINTMENTS,
            ...DEFAULT_WORKER_OPTIONS,
          },
        };

      default:
        return {
          queueName: EQueueType.DEFAULT,
          workerOptions: {
            name: EWorkerType.DEFAULT,
            ...DEFAULT_WORKER_OPTIONS,
          },
        };
    }
  }
}
