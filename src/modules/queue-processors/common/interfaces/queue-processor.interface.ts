import { Job } from "bullmq";
import { EQueueType } from "src/modules/queues/common/enums";
import { IQueueJobType } from "src/modules/queues/common/interfaces";

export interface IQueueProcessor {
  processJob(queueEnum: EQueueType, job: Job<IQueueJobType>): Promise<void>;
}
