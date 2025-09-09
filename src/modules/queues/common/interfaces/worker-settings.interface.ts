import { WorkerOptions } from "bullmq";
import { EQueueType } from "src/modules/queues/common/enums";

export interface IWorkerSettings {
  queueName: EQueueType;
  workerOptions: Omit<WorkerOptions, "connection">;
}
