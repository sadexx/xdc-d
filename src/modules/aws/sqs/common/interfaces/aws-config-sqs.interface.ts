import { IAwsBaseConfig } from "src/modules/aws/config/common/interface";

export interface IAwsConfigSqs extends IAwsBaseConfig {
  sqsQueueUrl: string;
  intervalTimeMinutes: number;
}
