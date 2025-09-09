import { QueueOptions } from "bullmq";
import { EQueueType } from "src/modules/queues/common/enums";

export interface IQueueSettings {
  queueName: EQueueType;
  queueOptions: Omit<QueueOptions, "connection">;
}
