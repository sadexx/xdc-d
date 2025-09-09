import { Injectable, Inject, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { BulkJobOptions, ConnectionOptions, DefaultJobOptions, JobsOptions, Queue } from "bullmq";
import { IQueueData, IQueueDataBulk, IQueueSettings } from "src/modules/queues/common/interfaces";
import { EQueueType } from "src/modules/queues/common/enums";
import { BULLMQ_CONNECTION } from "src/modules/queues/common/constants";
import {
  NUMBER_OF_MILLISECONDS_IN_MINUTE,
  NUMBER_OF_MILLISECONDS_IN_SECOND,
  NUMBER_OF_MINUTES_IN_FIFTEEN_DAYS,
  NUMBER_OF_SECONDS_IN_MINUTE,
} from "src/common/constants";
import { LokiLogger } from "src/common/logger";

/**
 * Service responsible for managing BullMQ queues throughout the application lifecycle.
 *
 * This service handles the creation, configuration, and destruction of queues for different
 * queue types. It provides methods to add single jobs, bulk jobs, and jobs with custom delays.
 * Each queue is configured with specific settings based on its type and purpose.
 *
 * `WorkerManagementService` - Companion service that manages workers for these queues
 */
@Injectable()
export class QueueManagementService implements OnModuleInit, OnModuleDestroy {
  private queueMap = new Map<EQueueType, { queue: Queue }>();
  private readonly lokiLogger = new LokiLogger(QueueManagementService.name);

  constructor(@Inject(BULLMQ_CONNECTION) private readonly connection: ConnectionOptions) {}

  /**
   * Initializes all queues when the module starts.
   *
   * This lifecycle method creates a queue instance for each queue type defined in
   * {@link EQueueType}. Each queue is configured with settings from {@link getQueueSettings}
   * and stored in the internal map for later use by job addition methods.
   *
   */
  public async onModuleInit(): Promise<void> {
    for (const queueEnum of Object.values(EQueueType)) {
      const { queueName, queueOptions } = await this.getQueueSettings(queueEnum);

      this.lokiLogger.debug(`Initializing Queue & Scheduler for enum "${queueEnum}" with name "${queueName}"`);

      const queue = new Queue(queueName, {
        connection: this.connection,
        ...queueOptions,
      });

      this.queueMap.set(queueEnum, { queue });
      this.lokiLogger.debug(`Queue & Scheduler created for "${queueName}"`);
    }
  }

  /**
   * Retrieves queue-specific settings including name and configuration options.
   *
   * This private method returns customized settings for each queue type, including
   * default job options such as retry attempts, backoff strategies, and cleanup policies.
   * The default configuration can be overridden for specific queue types to meet
   * their unique requirements.
   *
   */
  private async getQueueSettings(queueEnum: EQueueType): Promise<IQueueSettings> {
    const DEFAULT_JOB_OPTIONS: DefaultJobOptions = {
      delay: NUMBER_OF_MILLISECONDS_IN_SECOND,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: NUMBER_OF_MILLISECONDS_IN_MINUTE,
      },
      removeOnComplete: true,
      removeOnFail: { age: NUMBER_OF_MINUTES_IN_FIFTEEN_DAYS * NUMBER_OF_SECONDS_IN_MINUTE, count: 200 },
    };

    switch (queueEnum) {
      case EQueueType.PAYMENTS_QUEUE:
        return {
          queueName: EQueueType.PAYMENTS_QUEUE,
          queueOptions: {
            defaultJobOptions: DEFAULT_JOB_OPTIONS,
          },
        };

      case EQueueType.NOTIFICATIONS_QUEUE:
        return {
          queueName: EQueueType.NOTIFICATIONS_QUEUE,
          queueOptions: {
            defaultJobOptions: { ...DEFAULT_JOB_OPTIONS, removeOnFail: true },
          },
        };

      case EQueueType.WEBHOOKS_QUEUE:
        return {
          queueName: EQueueType.WEBHOOKS_QUEUE,
          queueOptions: {
            defaultJobOptions: DEFAULT_JOB_OPTIONS,
          },
        };

      case EQueueType.APPOINTMENTS_QUEUE:
        return {
          queueName: EQueueType.APPOINTMENTS_QUEUE,
          queueOptions: {
            defaultJobOptions: DEFAULT_JOB_OPTIONS,
          },
        };

      default:
        return {
          queueName: EQueueType.DEFAULT,
          queueOptions: {
            defaultJobOptions: DEFAULT_JOB_OPTIONS,
          },
        };
    }
  }

  /**
   * Cleans up all queue resources when the module is destroyed.
   *
   * This lifecycle method properly closes all queue instances to prevent memory leaks
   * and ensure graceful shutdown. It iterates through all stored queue instances
   * and calls their close method.
   *
   */
  public async onModuleDestroy(): Promise<void> {
    for (const [queueEnum, { queue }] of this.queueMap.entries()) {
      this.lokiLogger.debug(`Closing queue and scheduler for [${queueEnum}]`);
      await queue.close();
    }
  }

  /**
   * Logs an error message when a requested queue is not found.
   *
   * This private helper method provides consistent error logging when queue
   * operations are attempted on non-existent queues. This typically indicates
   * a configuration issue or module initialization problem.
   *
   * @param queueEnum - The queue type that was not found
   *
   */
  private queueNotFound(queueEnum: EQueueType): void {
    this.lokiLogger.error(`Queue not found: ${queueEnum}`);
  }

  /**
   * Adds a single job to the specified queue.
   *
   * This method adds a job to the queue identified by the queue enum in the job data.
   * The job will be processed according to the queue's default configuration unless
   * overridden by the provided options.
   *
   * @param jobData - Object containing the queue type and job details
   * @param opts - Optional BullMQ job options to override defaults
   *
   */
  public async addJob(jobData: IQueueData, opts?: JobsOptions): Promise<void> {
    const { queueEnum, jobItem } = jobData;
    const queueObject = this.queueMap.get(queueEnum);

    if (!queueObject) {
      this.queueNotFound(queueEnum);

      return;
    }

    await queueObject.queue.add(jobItem.jobName, jobItem, opts);
  }

  /**
   * Adds a single job to the specified queue with a custom delay.
   *
   * This method is similar to {@link addJob} but allows specifying a custom delay
   * that overrides the queue's default delay configuration. The delay determines
   * how long to wait before the job becomes available for processing.
   *
   * @param jobData - Object containing the queue type and job details
   * @param delay - Delay in milliseconds before the job becomes available for processing
   *
   */
  public async addJobWithCustomDelay(jobData: IQueueData, delay: number): Promise<void> {
    const { queueEnum, jobItem } = jobData;
    const queueObject = this.queueMap.get(queueEnum);

    if (!queueObject) {
      this.queueNotFound(queueEnum);

      return;
    }

    await queueObject.queue.add(jobItem.jobName, jobItem, { delay: delay });
  }

  /**
   * Adds multiple jobs to the specified queue in a single bulk operation.
   *
   * This method efficiently adds multiple jobs to a queue using BullMQ's bulk
   * operation capabilities. All jobs in the batch will use the same options
   * and will be processed according to the queue's configuration.
   *
   * @param jobData - Object containing the queue type and array of job items
   * @param opts - Optional BullMQ bulk job options applied to all jobs
   *
   */
  public async addBulk(jobData: IQueueDataBulk, opts?: BulkJobOptions): Promise<void> {
    const { queueEnum, jobItems } = jobData;
    const queueObject = this.queueMap.get(queueEnum);

    if (!queueObject) {
      this.queueNotFound(queueEnum);

      return;
    }

    const jobs = jobItems.map((jobData) => ({
      name: jobData.jobName,
      data: { jobName: jobData.jobName, payload: jobData.payload },
      opts: opts,
    }));

    await queueObject.queue.addBulk(jobs);
  }

  /**
   * Adds multiple jobs to the specified queue with staggered delays.
   *
   * This method adds multiple jobs with incrementally increasing delays, creating
   * a staggered execution pattern. Each subsequent job will have an additional
   * delay equal to its position in the array multiplied by the base delay.
   *
   * @param jobData - Object containing the queue type and array of job items
   * @param delay - Base delay in milliseconds between each job
   *
   */
  public async addBulkWithCustomDelay(jobData: IQueueDataBulk, delay: number): Promise<void> {
    const { queueEnum, jobItems } = jobData;
    const queueObject = this.queueMap.get(queueEnum);

    if (!queueObject) {
      this.queueNotFound(queueEnum);

      return;
    }

    const jobs = jobItems.map((jobData, index) => ({
      name: jobData.jobName,
      data: { jobName: jobData.jobName, payload: jobData.payload },
      opts: { delay: index * delay },
    }));

    await queueObject.queue.addBulk(jobs);
  }
}
